import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

// ============================================================================
// R23 — Paz y Salvo de Impuesto Predial
// Fundamento: Art. 34 Decreto 960 de 1970 + practica notarial (requisito ORIP)
// ============================================================================
// Valida que el paz y salvo del impuesto predial este vigente y corresponda
// al mismo predio del expediente. Sin esto, la ORIP puede rechazar el titulo.
// ============================================================================

// Dias de gracia por si el paz y salvo esta cerca de vencerse (30 dias antes).
const DIAS_ALERTA_PROXIMO_VENCIMIENTO = 30;

function diasEntre(fechaISO: string, hoyISO: string): number {
  const f1 = new Date(fechaISO + 'T00:00:00Z').getTime();
  const f2 = new Date(hoyISO + 'T00:00:00Z').getTime();
  return Math.floor((f1 - f2) / (1000 * 60 * 60 * 24));
}

function hoyISO(): string {
  return new Date().toISOString().substring(0, 10);
}

function normalizarDoc(doc: string | null | undefined): string {
  if (!doc) return '';
  return doc.replace(/[^0-9]/g, '');
}

export const R23_PazSalvoPredial: Rule = {
  id: 'R23',
  nombre: 'Paz y salvo impuesto predial',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { certificado, otrosDocumentos } = ctx;

    // 1. Buscar el paz y salvo predial
    const pazSalvo = otrosDocumentos.find((d) => d.tipo === 'paz_salvo_predial');
    if (!pazSalvo) {
      return {
        reglaId: 'R23', severity: 'review',
        titulo: 'Paz y salvo predial no aportado',
        descripcion: 'No se aporto el paz y salvo del impuesto predial.',
        razon: 'El paz y salvo predial es requisito de admision en la ORIP (Art. 34 Decreto 960 de 1970). Sube el certificado de paz y salvo vigente.',
      };
    }

    const datos = pazSalvo.rawExtraction?.paz_salvo;
    if (!datos) {
      return {
        reglaId: 'R23', severity: 'review',
        titulo: 'Paz y salvo sin datos extraidos',
        descripcion: 'No se pudieron extraer los datos del paz y salvo.',
        docAId: pazSalvo.id, docAField: 'Paz y salvo',
        docAValue: 'NO DETECTADO',
        razon: 'Verifica manualmente la vigencia del paz y salvo predial.',
      };
    }

    // 2. Verificar tipo (predial vs valorizacion)
    if (datos.tipo === 'valorizacion') {
      return {
        reglaId: 'R23', severity: 'review',
        titulo: 'Documento no es paz y salvo predial',
        descripcion: 'El documento subido como paz y salvo predial parece ser de valorizacion.',
        docAId: pazSalvo.id, docAField: 'Tipo',
        docAValue: datos.tipo,
        razon: 'Verifica que el documento sea el paz y salvo del impuesto predial.',
      };
    }

    // 3. Verificar vigencia (el hallazgo mas importante)
    const hoy = hoyISO();
    if (!datos.valido_hasta) {
      return {
        reglaId: 'R23', severity: 'review',
        titulo: 'Paz y salvo sin fecha de vigencia',
        descripcion: 'El paz y salvo no indica fecha de validez. No se puede verificar si esta vigente.',
        docAId: pazSalvo.id, docAField: 'Valido hasta',
        docAValue: 'NO DETECTADO',
        razon: 'Los paz y salvos suelen tener vigencia. Solicita uno actualizado o verifica manualmente.',
      };
    }

    const dias = diasEntre(datos.valido_hasta, hoy);

    // Vencido → CRITICAL
    if (dias < 0) {
      const diasVencido = Math.abs(dias);
      const mesesVencido = Math.floor(diasVencido / 30);
      const tiempoTxt = mesesVencido >= 1
        ? mesesVencido + ' mes(es)'
        : diasVencido + ' dia(s)';

      return {
        reglaId: 'R23', severity: 'critical',
        titulo: 'Paz y salvo predial VENCIDO',
        descripcion: 'El paz y salvo predial esta vencido hace ' + tiempoTxt + ' (vencio el ' + datos.valido_hasta + ').',
        docAId: pazSalvo.id, docAField: 'Valido hasta',
        docAValue: datos.valido_hasta,
        razon: 'Un paz y salvo vencido no es aceptado por la ORIP. Solicita uno actualizado al municipio antes de radicar (Art. 34 Decreto 960 de 1970).',
      };
    }

    // Proximo a vencer (menos de 30 dias) → review preventivo
    if (dias <= DIAS_ALERTA_PROXIMO_VENCIMIENTO) {
      return {
        reglaId: 'R23', severity: 'review',
        titulo: 'Paz y salvo proximo a vencer',
        descripcion: 'El paz y salvo vence en ' + dias + ' dia(s) (' + datos.valido_hasta + ').',
        docAId: pazSalvo.id, docAField: 'Valido hasta',
        docAValue: datos.valido_hasta,
        razon: 'Radica antes del vencimiento o solicita uno nuevo para evitar rechazo (Art. 34 Decreto 960 de 1970).',
      };
    }

    // 4. Vigente → verificar propietario vs titular registral
    const titulares = certificado?.rawExtraction?.certificado?.titulares || [];
    if (titulares.length > 0 && datos.propietario) {
      const titular = titulares[titulares.length - 1];
      const nombreTitular = (titular.nombre_completo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const nombrePS = (datos.propietario || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      const palabrasTit = new Set(nombreTitular.split(' ').filter((p) => p.length > 2));
      const palabrasPS = new Set(nombrePS.split(' ').filter((p) => p.length > 2));
      let coincidencias = 0;
      for (const p of palabrasTit) {
        if (palabrasPS.has(p)) coincidencias++;
      }

      if (coincidencias < 2) {
        return {
          reglaId: 'R23', severity: 'review',
          titulo: 'Propietario del paz y salvo no coincide con titular registral',
          descripcion: 'El paz y salvo esta a nombre de "' + datos.propietario + '", pero el titular registral es "' + titular.nombre_completo + '".',
          docAId: pazSalvo.id, docAField: 'Propietario',
          docAValue: datos.propietario || 'NO DETECTADO',
          docBId: certificado?.id || '',
          docBField: 'Titular registral',
          docBValue: titular.nombre_completo || 'NO DETECTADO',
          razon: 'El paz y salvo debe estar a nombre del titular registral actual del predio.',
        };
      }
    }

    // 5. Vigente y propietario coincide → OK
    return {
      reglaId: 'R23', severity: 'ok',
      titulo: 'Paz y salvo predial vigente',
      descripcion: 'El paz y salvo esta vigente hasta ' + datos.valido_hasta + ' (' + dias + ' dias restantes).',
      docAId: pazSalvo.id, docAField: 'Valido hasta',
      docAValue: datos.valido_hasta,
      razon: 'El paz y salvo cumple con los requisitos de la ORIP (Art. 34 Decreto 960 de 1970).',
    };
  },
};
