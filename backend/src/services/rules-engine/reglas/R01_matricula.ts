import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

export const R01_Matricula: Rule = {
  id: 'R01',
  nombre: 'Coincidencia de matrícula inmobiliaria',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { escritura, certificado } = ctx;

    if (!escritura || !certificado) {
      return {
        reglaId: 'R01',
        severity: 'illegible',
        titulo: 'Coincidencia de matrícula inmobiliaria',
        descripcion: 'No se pudieron comparar las matrículas por falta de documentos.',
        razon: 'Se requiere tanto la escritura como el certificado para esta validación.',
      };
    }

    const matEscritura =
      escritura.rawExtraction?.matricula_inmobiliaria ||
      escritura.rawExtraction?.escritura?.matricula_inmobiliaria ||
      null;
    const matCertificado =
      certificado.rawExtraction?.matricula_inmobiliaria ||
      certificado.rawExtraction?.certificado?.numero_matricula ||
      null;

    if (!matEscritura || !matCertificado) {
      return {
        reglaId: 'R01',
        severity: 'illegible',
        titulo: 'Coincidencia de matrícula inmobiliaria',
        descripcion: 'No se pudo extraer la matrícula de uno o ambos documentos.',
        docAId: escritura.id,
        docAField: 'Matrícula',
        docAValue: matEscritura || 'NO DETECTADO',
        docBId: certificado.id,
        docBField: 'Matrícula',
        docBValue: matCertificado || 'NO DETECTADO',
        razon: 'Sin matrícula en ambos documentos no es posible confirmar que se refieren al mismo inmueble.',
      };
    }

    const coinciden =
      matEscritura.trim().toUpperCase() === matCertificado.trim().toUpperCase();

    if (coinciden) {
      return {
        reglaId: 'R01',
        severity: 'ok',
        titulo: 'Coincidencia de matrícula inmobiliaria',
        descripcion: 'La matrícula coincide entre la escritura y el certificado.',
        docAId: escritura.id,
        docAField: 'Matrícula',
        docAValue: matEscritura,
        docBId: certificado.id,
        docBField: 'Matrícula',
        docBValue: matCertificado,
        razon: 'Ambos documentos se refieren al mismo inmueble.',
      };
    }

    return {
      reglaId: 'R01',
      severity: 'critical',
      titulo: 'Inconsistencia en Matrícula Inmobiliaria',
      descripcion: 'Los números de matrícula no coinciden entre la escritura y el certificado.',
      docAId: escritura.id,
      docAField: 'Matrícula',
      docAValue: matEscritura,
      docBId: certificado.id,
      docBField: 'Matrícula',
      docBValue: matCertificado,
      razon: 'Si la matrícula no coincide, el inmueble referido en la escritura podría no ser el mismo del folio. Verifica antes de radicar (Art. 8 Ley 1579 de 2012).',
    };
  },
};