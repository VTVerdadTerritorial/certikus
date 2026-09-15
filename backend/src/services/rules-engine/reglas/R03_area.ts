import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

export const R03_Area: Rule = {
  id: 'R03',
  nombre: 'Coincidencia de área',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { escritura, certificado } = ctx;

    if (!escritura || !certificado) {
      return {
        reglaId: 'R03',
        severity: 'illegible',
        titulo: 'Coincidencia de área',
        descripcion: 'No se pudieron comparar las áreas por falta de documentos.',
        razon: 'Se requiere tanto la escritura como el certificado.',
      };
    }

    const areaEscritura = escritura.rawExtraction?.escritura?.area_m2 ?? null;
    const areaCertificado = certificado.rawExtraction?.certificado?.area_m2 ?? null;

    if (areaEscritura === null || areaCertificado === null) {
      return {
        reglaId: 'R03',
        severity: 'illegible',
        titulo: 'Coincidencia de área',
        descripcion: 'No se pudo extraer el área de uno o ambos documentos.',
        docAId: escritura.id,
        docAField: 'Área (m²)',
        docAValue:
          areaEscritura !== null ? `${areaEscritura} m²` : 'NO DETECTADO',
        docBId: certificado.id,
        docBField: 'Área (m²)',
        docBValue:
          areaCertificado !== null ? `${areaCertificado} m²` : 'NO DETECTADO',
        razon: 'Se recomienda solicitar el certificado catastral para contrastar el área.',
      };
    }

    const diferencia = Math.abs(areaEscritura - areaCertificado);
    const porcentajeDiferencia = (diferencia / areaCertificado) * 100;
    const dentroDelMargen = porcentajeDiferencia <= 5;

    if (dentroDelMargen) {
      return {
        reglaId: 'R03',
        severity: 'ok',
        titulo: 'Coincidencia de área',
        descripcion: `El área coincide dentro del margen del 5% (diferencia: ${porcentajeDiferencia.toFixed(2)}%).`,
        docAId: escritura.id,
        docAField: 'Área (m²)',
        docAValue: `${areaEscritura} m²`,
        docBId: certificado.id,
        docBField: 'Área (m²)',
        docBValue: `${areaCertificado} m²`,
        razon: 'Las áreas son consistentes entre los documentos.',
      };
    }

    return {
      reglaId: 'R03',
      severity: 'review',
      titulo: 'Diferencia en área del inmueble',
      descripcion: `El área difiere entre los documentos en ${porcentajeDiferencia.toFixed(2)}%, superior al 5% tolerado.`,
      docAId: escritura.id,
      docAField: 'Área (m²)',
      docAValue: `${areaEscritura} m²`,
      docBId: certificado.id,
      docBField: 'Área (m²)',
      docBValue: `${areaCertificado} m²`,
      razon: 'Puede deberse a una actualización catastral no reflejada en la escritura o a un error de transcripción. Se recomienda verificar (Art. 16 Par. 1 Ley 1579).',
    };
  },
};