import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

// ============================================================================
// R27 — Analisis de Uso de Suelo
// Fundamento: Ley 388 de 1997 (Ordenamiento Territorial)
//             Decreto 1077 de 2015 (Sector Vivienda)
//             Art. 3 Ley 1579 de 2012 (identificacion del predio)
// ============================================================================
// Valida el certificado de uso de suelo (Curaduria o Planeacion Municipal):
//   - Vigencia (vencido, proximo a vencer, sin fecha)
//   - Coherencia del numero predial con el certificado de tradicion
//   - Coherencia del tipo de suelo (urbano/rural) con el uso principal
//   - Reporta SIEMPRE el tipo de suelo y el uso principal permitido
// ============================================================================

// Usos tipicos por tipo de suelo (para validar coherencia)
const USOS_URBANOS = [
  'residencial', 'comercial', 'servicios', 'industrial', 'dotacional',
  'mixto', 'oficinas', 'institucional', 'recreativo',
];

const USOS_RURALES = [
  'agricola', 'agricultura', 'ganadero', 'ganaderia', 'forestal',
  'agropecuario', 'agroforestal', 'minero', 'pesquero', 'silvopastoril',
  'cultivos', 'pecuario',
];

const DIAS_ALERTA_VENCIMIENTO = 30;

function diasEntre(fechaISO: string, hoyISO: string): number {
  const f1 = new Date(fechaISO + 'T00:00:00Z').getTime();
  const f2 = new Date(hoyISO + 'T00:00:00Z').getTime();
  return Math.floor((f1 - f2) / (1000 * 60 * 60 * 24));
}

function hoyISO(): string {
  return new Date().toISOString().substring(0, 10);
}

function normalizarPredial(p: string | null | undefined): string {
  if (!p) return '';
  return p.replace(/[^0-9]/g, '');
}

function nombreTipoSuelo(tipo: string | null | undefined): string {
  const mapa: Record<string, string> = {
    urbano: 'Urbano',
    rural: 'Rural',
    expansion_urbana: 'Expansion urbana',
    suburbano: 'Suburbano',
    proteccion: 'Proteccion',
  };
  return tipo ? (mapa[tipo] || tipo) : 'No especificado';
}

export const R27_UsoSuelo: Rule = {
  id: 'R27',
  nombre: 'Analisis de uso de suelo',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { certificado, otrosDocumentos } = ctx;

    // 1. Buscar el uso de suelo (documento opcional)
    const usoSuelo = otrosDocumentos.find((d) => d.tipo === 'uso_suelo' as any);

    if (!usoSuelo) {
      return {
        reglaId: 'R27', severity: 'ok',
        titulo: 'Sin informacion de uso de suelo',
        descripcion: 'No se aporto el certificado de uso de suelo. Sin este documento no hay informacion sobre el uso permitido del predio (residencial, comercial, industrial, etc.).',
        razon: 'El uso de suelo es exigido por algunos municipios para tramites especificos (licencias de construccion, PH, etc.). Consulta con la Curaduria o Planeacion Municipal si aplica a tu tramite.',
      };
    }

    const datos = usoSuelo.rawExtraction?.uso_suelo;
    if (!datos) {
      return {
        reglaId: 'R27', severity: 'review',
        titulo: 'Uso de suelo sin datos extraidos',
        descripcion: 'No se pudieron extraer los datos del certificado de uso de suelo.',
        docAId: usoSuelo.id, docAField: 'Uso de suelo',
        docAValue: 'NO DETECTADO',
        razon: 'Verifica manualmente la vigencia y coherencia del uso de suelo.',
      };
    }

    const tipoSueloTxt = nombreTipoSuelo(datos.tipo_suelo);
    const usoTxt = datos.uso_principal_permitido || 'No especificado';
    const hoy = hoyISO();

    // 2. Verificar vigencia
    if (datos.vigencia_hasta) {
      const dias = diasEntre(datos.vigencia_hasta, hoy);

      if (dias < 0) {
        const diasVencido = Math.abs(dias);
        const mesesVencido = Math.floor(diasVencido / 30);
        const tiempoTxt = mesesVencido >= 1
          ? mesesVencido + ' mes(es)'
          : diasVencido + ' dia(s)';
        return {
          reglaId: 'R27', severity: 'critical',
          titulo: 'Uso de suelo VENCIDO',
          descripcion: 'El certificado de uso de suelo esta vencido hace ' + tiempoTxt + ' (vencio el ' + datos.vigencia_hasta + '). Tipo de suelo: ' + tipoSueloTxt + '. Uso principal declarado: ' + usoTxt + '.',
          docAId: usoSuelo.id, docAField: 'Vigencia hasta',
          docAValue: datos.vigencia_hasta,
          razon: 'Un certificado de uso de suelo vencido no es valido. Solicita uno actualizado al municipio antes de radicar (Ley 388 de 1997).',
        };
      }

      if (dias <= DIAS_ALERTA_VENCIMIENTO) {
        return {
          reglaId: 'R27', severity: 'review',
          titulo: 'Uso de suelo proximo a vencer',
          descripcion: 'El certificado de uso de suelo vence en ' + dias + ' dia(s) (' + datos.vigencia_hasta + '). Tipo de suelo: ' + tipoSueloTxt + '. Uso principal: ' + usoTxt + '.',
          docAId: usoSuelo.id, docAField: 'Vigencia hasta',
          docAValue: datos.vigencia_hasta,
          razon: 'Radica antes del vencimiento o solicita uno nuevo para evitar rechazo.',
        };
      }
    } else if (!datos.fecha_expedicion) {
      return {
        reglaId: 'R27', severity: 'review',
        titulo: 'Uso de suelo sin fecha de vigencia',
        descripcion: 'El certificado no indica fecha de expedicion ni vigencia. Tipo de suelo: ' + tipoSueloTxt + '. Uso principal: ' + usoTxt + '.',
        docAId: usoSuelo.id, docAField: 'Vigencia',
        docAValue: 'NO DETECTADO',
        razon: 'Solicita un certificado actualizado o verifica manualmente su vigencia (Ley 388 de 1997).',
      };
    }

    // 3. Verificar coherencia del numero predial con el certificado de tradicion
    if (certificado && datos.numero_predial_nacional) {
      const predialUsoSuelo = normalizarPredial(datos.numero_predial_nacional);
      const codigoCatastralCert = normalizarPredial(
        (certificado.rawExtraction?.certificado as any)?.codigo_catastral || null
      );

      if (codigoCatastralCert && predialUsoSuelo && codigoCatastralCert.length > 10) {
        const coincide = predialUsoSuelo.includes(codigoCatastralCert) ||
                         codigoCatastralCert.includes(predialUsoSuelo);
        if (!coincide) {
          return {
            reglaId: 'R27', severity: 'critical',
            titulo: 'Uso de suelo de otro predio',
            descripcion: 'El numero predial del uso de suelo (' + predialUsoSuelo + ') NO coincide con el codigo catastral del certificado (' + codigoCatastralCert + '). Tipo de suelo: ' + tipoSueloTxt + '. Uso principal: ' + usoTxt + '.',
            docAId: usoSuelo.id, docAField: 'Numero predial',
            docAValue: predialUsoSuelo,
            docBId: certificado.id, docBField: 'Codigo catastral',
            docBValue: codigoCatastralCert,
            razon: 'El uso de suelo debe corresponder al mismo predio del certificado de tradicion. Verifica que sea el predio correcto (Art. 3 Ley 1579).',
          };
        }
      }
    }

    // 4. Verificar coherencia suelo <-> uso principal
    if (datos.tipo_suelo && datos.uso_principal_permitido) {
      const usoLower = datos.uso_principal_permitido.toLowerCase();

      // Suelo rural con uso urbano → CRITICAL
      if (datos.tipo_suelo === 'rural') {
        const esUsoUrbano = USOS_URBANOS.some((u) => usoLower.includes(u));
        const esUsoRural = USOS_RURALES.some((u) => usoLower.includes(u));
        if (esUsoUrbano && !esUsoRural) {
          return {
            reglaId: 'R27', severity: 'critical',
            titulo: 'Uso incompatible con suelo rural',
            descripcion: 'El predio esta clasificado como SUELO RURAL pero el uso principal declarado es "' + usoTxt + '" (uso urbano).',
            docAId: usoSuelo.id, docAField: 'Tipo de suelo vs Uso',
            docAValue: tipoSueloTxt + ' + ' + usoTxt,
            razon: 'En suelo rural solo se permiten usos agricolas, ganaderos, forestales o agropecuarios. Los usos urbanos requieren cambio de clasificacion del suelo (Ley 388 de 1997).',
          };
        }
      }

      // Suelo urbano con uso rural → REVIEW (menos grave, puede ser agricultura urbana)
      if (datos.tipo_suelo === 'urbano') {
        const esUsoRural = USOS_RURALES.some((u) => usoLower.includes(u));
        const esUsoUrbano = USOS_URBANOS.some((u) => usoLower.includes(u));
        if (esUsoRural && !esUsoUrbano) {
          return {
            reglaId: 'R27', severity: 'review',
            titulo: 'Uso rural en suelo urbano',
            descripcion: 'El predio esta clasificado como SUELO URBANO pero el uso principal declarado es "' + usoTxt + '" (uso rural).',
            docAId: usoSuelo.id, docAField: 'Tipo de suelo vs Uso',
            docAValue: tipoSueloTxt + ' + ' + usoTxt,
            razon: 'Verifica con la Curaduria si el uso declarado esta permitido en esta zona del POT (Ley 388 de 1997).',
          };
        }
      }
    }

    // 5. Todo bien → OK con reporte del tipo de suelo y uso
    return {
      reglaId: 'R27', severity: 'ok',
      titulo: 'Uso de suelo vigente y coherente',
      descripcion: 'Certificado vigente' + (datos.vigencia_hasta ? ' hasta ' + datos.vigencia_hasta : '') + '. Tipo de suelo: ' + tipoSueloTxt + '. Uso principal permitido: ' + usoTxt + '.',
      docAId: usoSuelo.id, docAField: 'Tipo de suelo + Uso principal',
      docAValue: tipoSueloTxt + ' / ' + usoTxt,
      razon: 'El uso de suelo cumple con los requisitos del municipio (Ley 388 de 1997).',
    };
  },
};
