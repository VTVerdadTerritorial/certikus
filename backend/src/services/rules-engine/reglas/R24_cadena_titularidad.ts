import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

// ============================================================================
// R24 — Analisis de Cadena de Titularidad
// Fundamento: Art. 3 y Art. 29 Ley 1579 de 2012 (tracto sucesivo)
//             Art. 47 Ley 1579 (falsa tradicion)
// ============================================================================
// Reconstruye la cadena de dominio desde las anotaciones del certificado y
// verifica que el vendedor actual tenga DOMINIO PLENO (serie 01xx) y no
// solo FALSA TRADICION (serie 06xx).
// ============================================================================

interface AnotacionDominio {
  numero: number | null;
  codigo: string;
  tipo: 'dominio_pleno' | 'falsa_tradicion' | 'otro';
  descripcion: string;
}

// Series de codigos
const SERIE_DOMINIO_PLENO = '01';   // Compraventa, permuta, donacion, etc.
const SERIE_FALSA_TRADICION = '06'; // Falsa tradicion, derechos y acciones

export const R24_CadenaTitularidad: Rule = {
  id: 'R24',
  nombre: 'Analisis de cadena de titularidad',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { certificado } = ctx;
    if (!certificado) {
      return {
        reglaId: 'R24', severity: 'illegible',
        titulo: 'Analisis de cadena de titularidad',
        descripcion: 'No se puede verificar sin el certificado de tradicion.',
        razon: 'Se requiere el certificado para reconstruir la cadena de dominio.',
      };
    }

    const anotaciones = certificado.rawExtraction?.certificado?.anotaciones || [];
    if (anotaciones.length === 0) {
      return {
        reglaId: 'R24', severity: 'illegible',
        titulo: 'Sin anotaciones extraidas',
        descripcion: 'No se pudieron extraer las anotaciones del certificado.',
        razon: 'Verifica que el certificado sea legible y contenga anotaciones.',
      };
    }

    // 1. Clasificar las anotaciones por tipo
    const dominio: AnotacionDominio[] = [];
    for (const a of anotaciones) {
      const codigo = (a.codigo_anotacion || '').trim();
      if (codigo.startsWith(SERIE_DOMINIO_PLENO)) {
        dominio.push({
          numero: a.numero_anotacion,
          codigo,
          tipo: 'dominio_pleno',
          descripcion: (a.descripcion || '').substring(0, 200),
        });
      } else if (codigo.startsWith(SERIE_FALSA_TRADICION)) {
        dominio.push({
          numero: a.numero_anotacion,
          codigo,
          tipo: 'falsa_tradicion',
          descripcion: (a.descripcion || '').substring(0, 200),
        });
      }
    }

    // 2. Si no hay anotaciones de dominio ni falsa tradicion → REVIEW
    if (dominio.length === 0) {
      return {
        reglaId: 'R24', severity: 'review',
        titulo: 'Cadena de titularidad no identificable',
        descripcion: 'No se identificaron anotaciones de tradicion (serie 01xx) ni de falsa tradicion (serie 06xx).',
        docAId: certificado.id, docAField: 'Anotaciones',
        docAValue: anotaciones.length + ' anotaciones',
        razon: 'No se puede reconstruir la cadena de dominio sin anotaciones de tradicion. Verifica manualmente.',
      };
    }

    // 3. Determinar el estado de la ultima anotacion de dominio
    const ultimaAnotacion = dominio[dominio.length - 1];
    const tieneDominioPleno = dominio.some((d) => d.tipo === 'dominio_pleno');
    const tieneFalsaTradicion = dominio.some((d) => d.tipo === 'falsa_tradicion');

    // 4. Caso CRITICO: ultima anotacion es falsa tradicion (vendedor solo tiene posesion)
    if (ultimaAnotacion.tipo === 'falsa_tradicion' && !tieneDominioPleno) {
      return {
        reglaId: 'R24', severity: 'critical',
        titulo: 'Cadena sin dominio pleno (solo falsa tradicion)',
        descripcion: 'El folio NO tiene ninguna anotacion de dominio pleno (serie 01xx). Todas las anotaciones son de falsa tradicion o transmision de posesion.',
        docAId: certificado.id, docAField: 'Ultima anotacion',
        docAValue: 'Anotacion ' + ultimaAnotacion.numero + ' (' + ultimaAnotacion.codigo + ')',
        razon: 'El titular registral NO tiene dominio pleno sino solo posesion. La cadena de dominio esta interrumpida. Requiere saneamiento antes de cualquier venta (Art. 3 y 29 Ley 1579).',
      };
    }

    // 5. Caso mixto: tiene dominio pero la ultima es falsa tradicion
    if (ultimaAnotacion.tipo === 'falsa_tradicion' && tieneDominioPleno) {
      return {
        reglaId: 'R24', severity: 'critical',
        titulo: 'Cadena de dominio interrumpida',
        descripcion: 'La ultima anotacion del folio es de falsa tradicion (anotacion ' + ultimaAnotacion.numero + '), aunque previamente hubo anotaciones de dominio pleno.',
        docAId: certificado.id, docAField: 'Ultima anotacion',
        docAValue: 'Anotacion ' + ultimaAnotacion.numero + ' (' + ultimaAnotacion.codigo + ')',
        razon: 'El titular registral actual NO tiene dominio pleno. La cadena de titulacion se interrumpio. Requiere saneamiento antes de cualquier venta (Art. 3 y 29 Ley 1579).',
      };
    }

    // 6. Caso favorable: ultima anotacion es dominio pleno
    if (ultimaAnotacion.tipo === 'dominio_pleno') {
      // Advertir si hubo falsa tradicion previa
      if (tieneFalsaTradicion) {
        return {
          reglaId: 'R24', severity: 'review',
          titulo: 'Cadena con dominio pleno actual pero con falsa tradicion previa',
          descripcion: 'El folio tiene dominio pleno en la ultima anotacion, pero contiene ' + dominio.filter((d) => d.tipo === 'falsa_tradicion').length + ' anotacion(es) previas de falsa tradicion.',
          docAId: certificado.id, docAField: 'Ultima anotacion',
          docAValue: 'Anotacion ' + ultimaAnotacion.numero + ' (dominio pleno)',
          razon: 'El titular registral actual tiene dominio pleno, pero la cadena contiene anotaciones de falsa tradicion previa. Verifica que la tradicion este completamente saneada (Art. 47 Ley 1579).',
        };
      }

      return {
        reglaId: 'R24', severity: 'ok',
        titulo: 'Cadena de titularidad con dominio pleno',
        descripcion: 'El folio tiene dominio pleno en la ultima anotacion (' + ultimaAnotacion.numero + '). No hay interrupciones en la cadena.',
        docAId: certificado.id, docAField: 'Ultima anotacion',
        docAValue: 'Anotacion ' + ultimaAnotacion.numero + ' (' + ultimaAnotacion.codigo + ')',
        razon: 'El titular registral actual tiene dominio pleno. Se respeta el tracto sucesivo (Art. 3 y 29 Ley 1579).',
      };
    }

    // 7. Fallback: ultima anotacion no clasificada
    return {
      reglaId: 'R24', severity: 'review',
      titulo: 'Cadena de titularidad requiere revision manual',
      descripcion: 'La ultima anotacion de dominio no pudo clasificarse claramente como dominio pleno ni falsa tradicion.',
      docAId: certificado.id, docAField: 'Ultima anotacion',
      docAValue: 'Anotacion ' + ultimaAnotacion.numero + ' (' + ultimaAnotacion.codigo + ')',
      razon: 'Verifica manualmente la naturaleza juridica de la ultima anotacion (Art. 29 Ley 1579).',
    };
  },
};
