import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

const CONFIANZA_MINIMA = 60;

export const R06_Legibilidad: Rule = {
  id: 'R06',
  nombre: 'Legibilidad de los documentos',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { escritura, certificado } = ctx;

    const docs = [escritura, certificado].filter(
      (d): d is NonNullable<typeof escritura> => d !== null
    );

    if (docs.length === 0) {
      return {
        reglaId: 'R06',
        severity: 'illegible',
        titulo: 'Legibilidad de los documentos',
        descripcion: 'No hay documentos para evaluar.',
        razon: 'Se requiere al menos un documento.',
      };
    }

    const conBajaConfianza = docs.filter((d) => {
      const confidence = d.rawExtraction?.confidence ?? 0;
      return confidence < CONFIANZA_MINIMA;
    });

    if (conBajaConfianza.length === 0) {
      const confidencePromedio =
        docs.reduce((sum, d) => sum + (d.rawExtraction?.confidence || 0), 0) /
        docs.length;
      return {
        reglaId: 'R06',
        severity: 'ok',
        titulo: 'Legibilidad de los documentos',
        descripcion: `Todos los documentos fueron legibles (confianza promedio: ${confidencePromedio.toFixed(0)}%).`,
        razon: 'Los documentos se pudieron procesar con buena calidad.',
      };
    }

    const primerDoc = conBajaConfianza[0];
    const confidence = primerDoc.rawExtraction?.confidence ?? 0;
    const notas = primerDoc.rawExtraction?.notas_legibilidad;

    return {
      reglaId: 'R06',
      severity: 'illegible',
      titulo: 'Documento de baja legibilidad',
      descripcion: `Uno o más documentos tienen baja legibilidad (confianza: ${confidence}%).`,
      docAId: primerDoc.id,
      docAField: 'Confianza OCR',
      docAValue: `BAJA CONFIANZA (< ${CONFIANZA_MINIMA}%)`,
      razon: notas || 'El documento es manuscrito o de baja calidad. Se requiere transcripción manual o una copia más legible.',
    };
  },
};