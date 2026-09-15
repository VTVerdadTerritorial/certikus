import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

function normalizarNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const R02_Titular: Rule = {
  id: 'R02',
  nombre: 'Coincidencia de titular',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { escritura, certificado } = ctx;

    if (!escritura || !certificado) {
      return {
        reglaId: 'R02',
        severity: 'illegible',
        titulo: 'Coincidencia de titular',
        descripcion: 'No se pudieron comparar los titulares por falta de documentos.',
        razon: 'Se requiere tanto la escritura como el certificado.',
      };
    }

    const comparecientes = escritura.rawExtraction?.escritura?.comparecientes || [];
    const titulares = certificado.rawExtraction?.certificado?.titulares || [];

    const nombresEscritura = comparecientes
      .map((c) => c.nombre_completo)
      .filter((n): n is string => !!n)
      .map(normalizarNombre);

    const nombresCertificado = titulares
      .map((t) => t.nombre_completo)
      .filter((n): n is string => !!n)
      .map(normalizarNombre);

    if (nombresEscritura.length === 0 || nombresCertificado.length === 0) {
      return {
        reglaId: 'R02',
        severity: 'illegible',
        titulo: 'Coincidencia de titular',
        descripcion: 'No se pudieron extraer nombres de uno o ambos documentos.',
        docAId: escritura.id,
        docAField: 'Comparecientes',
        docAValue:
          nombresEscritura.length > 0 ? nombresEscritura.join(', ') : 'NO DETECTADO',
        docBId: certificado.id,
        docBField: 'Titulares',
        docBValue:
          nombresCertificado.length > 0
            ? nombresCertificado.join(', ')
            : 'NO DETECTADO',
        razon: 'Sin nombres en ambos documentos no se puede validar tracto sucesivo (Art. 3 Ley 1579 de 2012).',
      };
    }

    // Al menos un titular del certificado debe aparecer en la escritura
    const hayCoincidencia = nombresCertificado.some((n) =>
      nombresEscritura.includes(n)
    );

    if (hayCoincidencia) {
      return {
        reglaId: 'R02',
        severity: 'ok',
        titulo: 'Coincidencia de titular',
        descripcion: 'Al menos un titular del certificado aparece en la escritura.',
        docAId: escritura.id,
        docAField: 'Comparecientes',
        docAValue: nombresEscritura.join(', '),
        docBId: certificado.id,
        docBField: 'Titulares',
        docBValue: nombresCertificado.join(', '),
        razon: 'Los nombres coinciden, respetando el principio de tracto sucesivo.',
      };
    }

    return {
      reglaId: 'R02',
      severity: 'critical',
      titulo: 'Inconsistencia en Titular',
      descripcion: 'Ningún titular del certificado coincide con los comparecientes de la escritura.',
      docAId: escritura.id,
      docAField: 'Comparecientes',
      docAValue: nombresEscritura.join(', '),
      docBId: certificado.id,
      docBField: 'Titulares',
      docBValue: nombresCertificado.join(', '),
      razon: 'Los nombres no coinciden. Esto puede indicar que quien vende no es el titular registral, lo cual viola el principio de tracto sucesivo.',
    };
  },
};