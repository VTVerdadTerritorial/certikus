import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

// Normaliza un nombre: minúsculas, sin tildes, sin puntuación, espacios simples.
function normalizarNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,;:()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extrae las palabras significativas de un nombre (> 2 letras),
// ignorando artículos y preposiciones comunes en español.
const PALABRAS_IGNORADAS = new Set(['de', 'la', 'las', 'los', 'del', 'y', 'e', 'o', 'u']);

function palabrasSignificativas(nombre: string): Set<string> {
  const normalizado = normalizarNombre(nombre);
  return new Set(
    normalizado
      .split(' ')
      .filter((p) => p.length > 2 && !PALABRAS_IGNORADAS.has(p))
  );
}

// Determina si dos nombres corresponden a la misma persona.
// Criterio: comparten al menos 2 palabras significativas.
// Esto tolera cambios de orden (nombre-apellido vs apellido-nombre)
// y variaciones menores de transcripción.
function sonMismoTitular(a: string, b: string): boolean {
  const palabrasA = palabrasSignificativas(a);
  const palabrasB = palabrasSignificativas(b);
  let coincidencias = 0;
  for (const p of palabrasA) {
    if (palabrasB.has(p)) coincidencias++;
  }
  return coincidencias >= 2;
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
      .map((c: any) => c.nombre_completo)
      .filter((n: any): n is string => !!n);

    const nombresCertificado = titulares
      .map((t: any) => t.nombre_completo)
      .filter((n: any): n is string => !!n);

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

    // Al menos un titular del certificado debe corresponder a un compareciente
    // de la escritura. La comparación tolera cambios de orden y tildes.
    const coincidencia = nombresCertificado.find((nCert: any) =>
      nombresEscritura.some((nEsc: any) => sonMismoTitular(nCert, nEsc))
    );

    if (coincidencia) {
      return {
        reglaId: 'R02',
        severity: 'ok',
        titulo: 'Coincidencia de titular',
        descripcion: `El titular "${coincidencia}" del certificado coincide con un compareciente de la escritura.`,
        docAId: escritura.id,
        docAField: 'Comparecientes',
        docAValue: nombresEscritura.join(', '),
        docBId: certificado.id,
        docBField: 'Titulares',
        docBValue: nombresCertificado.join(', '),
        razon: 'Los nombres coinciden (comparación por palabras significativas), respetando el principio de tracto sucesivo.',
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