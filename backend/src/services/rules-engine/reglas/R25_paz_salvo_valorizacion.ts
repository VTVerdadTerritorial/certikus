import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

// ============================================================================
// R25 — Paz y Salvo de Contribucion por Valorizacion
// Fundamento: Ley 1682 de 2013 + practica notarial (requisito ORIP)
// ============================================================================
// Valida que el paz y salvo de valorizacion este vigente, SOLO si el predio
// tiene contribucion por valorizacion pendiente o registrada.
// ============================================================================

const DIAS_ALERTA_PROXIMO_VENCIMIENTO = 30;

function diasEntre(fechaISO: string, hoyISO: string): number {
  const f1 = new Date(fechaISO + 'T00:00:00Z').getTime();
  const f2 = new Date(hoyISO + 'T00:00:00Z').getTime();
  return Math.floor((f1 - f2) / (1000 * 60 * 60 * 24));
}

function hoyISO(): string {
  return new Date().toISOString().substring(0, 10);
}

export const R25_PazSalvoValorizacion: Rule = {
  id: 'R25',
  nombre: 'Paz y salvo valorizacion',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { otrosDocumentos } = ctx;

    const pazSalvo = otrosDocumentos.find((d) => d.tipo === 'paz_salvo_valorizacion');

    // Si no se aporto → OK (no siempre aplica; solo si el predio tiene valorizacion)
    if (!pazSalvo) {
      return {
        reglaId: 'R25', severity: 'ok',
        titulo: 'Paz y salvo valorizacion no aplica',
        descripcion: 'No se aporto paz y salvo de valorizacion. Si el predio no tiene contribucion por valorizacion, no es requerido.',
        razon: 'La contribucion por valorizacion solo aplica a predios beneficiados por obras publicas (Ley 1682 de 2013).',
      };
    }

    const datos = pazSalvo.rawExtraction?.paz_salvo;
    if (!datos) {
      return {
        reglaId: 'R25', severity: 'review',
        titulo: 'Paz y salvo valorizacion sin datos',
        descripcion: 'No se pudieron extraer los datos del paz y salvo de valorizacion.',
        docAId: pazSalvo.id, docAField: 'Paz y salvo',
        docAValue: 'NO DETECTADO',
        razon: 'Verifica manualmente la vigencia del paz y salvo de valorizacion.',
      };
    }

    // Verificar vigencia
    const hoy = hoyISO();
    if (!datos.valido_hasta) {
      return {
        reglaId: 'R25', severity: 'review',
        titulo: 'Paz y salvo valorizacion sin fecha de vigencia',
        descripcion: 'El paz y salvo de valorizacion no indica fecha de validez.',
        docAId: pazSalvo.id, docAField: 'Valido hasta',
        docAValue: 'NO DETECTADO',
        razon: 'Solicita un paz y salvo actualizado o verifica manualmente la vigencia.',
      };
    }

    const dias = diasEntre(datos.valido_hasta, hoy);

    if (dias < 0) {
      const diasVencido = Math.abs(dias);
      const mesesVencido = Math.floor(diasVencido / 30);
      const tiempoTxt = mesesVencido >= 1
        ? mesesVencido + ' mes(es)'
        : diasVencido + ' dia(s)';

      return {
        reglaId: 'R25', severity: 'critical',
        titulo: 'Paz y salvo valorizacion VENCIDO',
        descripcion: 'El paz y salvo de valorizacion esta vencido hace ' + tiempoTxt + ' (vencio el ' + datos.valido_hasta + ').',
        docAId: pazSalvo.id, docAField: 'Valido hasta',
        docAValue: datos.valido_hasta,
        razon: 'Un paz y salvo vencido no es aceptado por la ORIP. Solicita uno actualizado (Ley 1682 de 2013).',
      };
    }

    if (dias <= DIAS_ALERTA_PROXIMO_VENCIMIENTO) {
      return {
        reglaId: 'R25', severity: 'review',
        titulo: 'Paz y salvo valorizacion proximo a vencer',
        descripcion: 'El paz y salvo vence en ' + dias + ' dia(s) (' + datos.valido_hasta + ').',
        docAId: pazSalvo.id, docAField: 'Valido hasta',
        docAValue: datos.valido_hasta,
        razon: 'Radica antes del vencimiento o solicita uno nuevo para evitar rechazo.',
      };
    }

    return {
      reglaId: 'R25', severity: 'ok',
      titulo: 'Paz y salvo valorizacion vigente',
      descripcion: 'El paz y salvo de valorizacion esta vigente hasta ' + datos.valido_hasta + ' (' + dias + ' dias restantes).',
      docAId: pazSalvo.id, docAField: 'Valido hasta',
      docAValue: datos.valido_hasta,
      razon: 'El paz y salvo cumple con los requisitos de la ORIP (Ley 1682 de 2013).',
    };
  },
};
