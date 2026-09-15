import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

function extraerPuntosCardinales(texto: string): string[] {
  const normalized = texto.toLowerCase();
  const puntos = ['norte', 'sur', 'oriente', 'occidente', 'este', 'oeste'];
  return puntos.filter((p) => normalized.includes(p));
}

export const R07_Linderos: Rule = {
  id: 'R07',
  nombre: 'Coincidencia de linderos',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { escritura, certificado } = ctx;
    if (!escritura || !certificado) {
      return {
        reglaId: 'R07', severity: 'illegible',
        titulo: 'Coincidencia de linderos',
        descripcion: 'No se pudieron comparar los linderos por falta de documentos.',
        razon: 'Se requiere escritura y certificado.',
      };
    }
    const linderosEscritura = escritura.rawExtraction?.escritura?.linderos || null;
    const linderosCertificado = certificado.rawExtraction?.certificado?.linderos || null;

    if (!linderosEscritura || !linderosCertificado) {
      return {
        reglaId: 'R07', severity: 'illegible',
        titulo: 'Coincidencia de linderos',
        descripcion: 'No se pudieron extraer linderos de uno o ambos documentos.',
        docAId: escritura.id, docAField: 'Linderos',
        docAValue: linderosEscritura || 'NO DETECTADO',
        docBId: certificado.id, docBField: 'Linderos',
        docBValue: linderosCertificado || 'NO DETECTADO',
        razon: 'Sin linderos en ambos documentos no es posible validar la delimitación (Art. 16 Par. 1 Ley 1579).',
      };
    }
    const puntosEscritura = extraerPuntosCardinales(linderosEscritura);
    const puntosCertificado = extraerPuntosCardinales(linderosCertificado);
    const puntosFaltantes = puntosCertificado.filter(
      (p) => !puntosEscritura.includes(p)
    );
    if (puntosFaltantes.length === 0) {
      return {
        reglaId: 'R07', severity: 'ok',
        titulo: 'Coincidencia de linderos',
        descripcion: 'Los puntos cardinales de los linderos coinciden.',
        docAId: escritura.id, docAField: 'Linderos',
        docAValue: puntosEscritura.join(', ') || 'Sin puntos cardinales',
        docBId: certificado.id, docBField: 'Linderos',
        docBValue: puntosCertificado.join(', ') || 'Sin puntos cardinales',
        razon: 'Los linderos referencian los mismos puntos cardinales.',
      };
    }
    return {
      reglaId: 'R07', severity: 'review',
      titulo: 'Inconsistencia en linderos',
      descripcion: 'Faltan puntos cardinales en la escritura que sí aparecen en el certificado.',
      docAId: escritura.id, docAField: 'Linderos',
      docAValue: puntosEscritura.join(', ') || 'Sin puntos cardinales',
      docBId: certificado.id, docBField: 'Linderos',
      docBValue: puntosCertificado.join(', ') || 'Sin puntos cardinales',
      razon: `Puntos faltantes: ${puntosFaltantes.join(', ')}. Verifica antes de radicar.`,
    };
  },
};