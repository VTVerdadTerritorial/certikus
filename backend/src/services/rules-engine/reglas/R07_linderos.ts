import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

// ============================================================================
// R07 — Coincidencia de linderos (reformulada)
// Fundamento: Art. 16 Par. 1 Ley 1579 de 2012 + Art. 31 Decreto 960 de 1970
// ============================================================================
// Compara los linderos por PUNTO CARDINAL y COLINDANTE, no solo por la
// presencia de las palabras. Un lindero sin colindante no identifica el predio.
// ============================================================================

const PUNTOS_CARDINALES = ['norte', 'sur', 'oriente', 'occidente', 'este', 'oeste'];

// Mapa de sinonimos notariales -> punto cardinal canonico.
// En escrituras antiguas es comun usar "cabecera/pie" en lugar de "norte/sur",
// y "costado derecho/izquierdo" en lugar de "oriente/occidente".
const SINONIMOS_CARDINALES: Record<string, string> = {
  norte: 'norte',
  cabecera: 'norte',
  pie: 'sur',
  sur: 'sur',
  oriente: 'oriente',
  este: 'oriente',
  'costado derecho': 'oriente',
  'lado derecho': 'oriente',
  occidente: 'occidente',
  oeste: 'occidente',
  'costado izquierdo': 'occidente',
  'lado izquierdo': 'occidente',
};

// Normaliza un texto: minusculas, sin tildes, espacios simples.
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,;:()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extrae pares {punto: colindante} de un texto de linderos.
// Ejemplo: "Por el NORTE con Marcos Moncayo, por el SUR con Julio..."
//   -> { norte: "marcos moncayo", sur: "julio..." }
function extraerLinderos(texto: string): Record<string, string> {
  const resultado: Record<string, string> = {};
  const t = normalizar(texto);

  // Detectar TODAS las apariciones de sinonimos (incluyendo "costado derecho" que tiene espacio)
  type Match = { pos: number; len: number; cardinal: string };
  const matches: Match[] = [];

  for (const [sinonimo, cardinal] of Object.entries(SINONIMOS_CARDINALES)) {
    let idx = 0;
    while ((idx = t.indexOf(sinonimo, idx)) !== -1) {
      matches.push({ pos: idx, len: sinonimo.length, cardinal });
      idx += sinonimo.length;
    }
  }

  // Ordenar por posicion
  matches.sort((a, b) => a.pos - b.pos);

  // Para cada match, extraer el texto hasta el siguiente match
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const desde = m.pos + m.len;
    const hasta = i + 1 < matches.length ? matches[i + 1].pos : t.length;

    let colindante = t.substring(desde, hasta).trim();
    colindante = colindante
      .replace(/^(con |o |y |, )+/, '')
      .replace(/^(con propiedades (de |del |de la )?|propiedades (de |del |de la )?|colinda con |linda con )+/, '')
      .trim();

    if (colindante.length > 2 && !resultado[m.cardinal]) {
      resultado[m.cardinal] = colindante;
    }
  }
  return resultado;
}

// Extrae las palabras significativas de un colindante para comparar.
const PALABRAS_IGNORADAS = new Set([
  'de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'o', 'u', 'al',
  'senor', 'senora', 'don', 'dona', 'herederos', 'sucesion',
]);

function palabrasColindante(texto: string): Set<string> {
  return new Set(
    normalizar(texto)
      .split(' ')
      .filter((p) => p.length > 2 && !PALABRAS_IGNORADAS.has(p))
  );
}

// Determina si dos colindantes se refieren a la misma persona/predio.
function mismoColindante(a: string, b: string): boolean {
  const pa = palabrasColindante(a);
  const pb = palabrasColindante(b);
  if (pa.size === 0 || pb.size === 0) {
    return normalizar(a) === normalizar(b);
  }
  // Al menos 1 palabra significativa en comun
  for (const p of pa) {
    if (pb.has(p)) return true;
  }
  return false;
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

    // Caso 1 — Sin linderos en NINGUNO: incumple Art. 16 Ley 1579 (critical)
    if (!linderosEscritura && !linderosCertificado) {
      return {
        reglaId: 'R07', severity: 'critical',
        titulo: 'Linderos no identificados en ningun documento',
        descripcion: 'Ni la escritura ni el certificado contienen linderos del inmueble.',
        docAId: escritura.id, docAField: 'Linderos',
        docAValue: 'NO DETECTADO',
        docBId: certificado.id, docBField: 'Linderos',
        docBValue: 'NO DETECTADO',
        razon: 'El Art. 16 Par. 1 de la Ley 1579 exige que el inmueble este identificado por linderos. Sin ellos no se puede verificar la delimitacion.',
      };
    }

    // Caso 2 — Solo uno tiene linderos: review (no es critico pero limita el analisis)
    if (!linderosEscritura || !linderosCertificado) {
      return {
        reglaId: 'R07', severity: 'review',
        titulo: 'Linderos incompletos',
        descripcion: 'Solo uno de los dos documentos contiene linderos del inmueble.',
        docAId: escritura.id, docAField: 'Linderos',
        docAValue: linderosEscritura || 'NO DETECTADO',
        docBId: certificado.id, docBField: 'Linderos',
        docBValue: linderosCertificado || 'NO DETECTADO',
        razon: 'Se recomienda contar con linderos en ambos documentos para validar la delimitacion (Art. 16 Par. 1 Ley 1579).',
      };
    }

    // Caso 3 — Ambos tienen linderos: comparar colindantes por punto cardinal
    const linderosA = extraerLinderos(linderosEscritura);
    const linderosB = extraerLinderos(linderosCertificado);

    const puntosA = Object.keys(linderosA);
    const puntosB = Object.keys(linderosB);
    const puntosComunes = puntosA.filter((p) => puntosB.includes(p));

    // Si no hay puntos comunes, no podemos comparar (review)
    if (puntosComunes.length === 0) {
      return {
        reglaId: 'R07', severity: 'review',
        titulo: 'Linderos sin puntos cardinales coincidentes',
        descripcion: 'La escritura y el certificado describen linderos, pero sin puntos cardinales en comun para comparar.',
        docAId: escritura.id, docAField: 'Linderos',
        docAValue: puntosA.join(', ') || 'Sin puntos cardinales',
        docBId: certificado.id, docBField: 'Linderos',
        docBValue: puntosB.join(', ') || 'Sin puntos cardinales',
        razon: 'Verifica manualmente que los linderos describan la misma delimitacion. Art. 31 Decreto 960 de 1970.',
      };
    }

    // Comparar colindantes en los puntos comunes
    const coincidencias: string[] = [];
    const discrepancias: string[] = [];

    for (const punto of puntosComunes) {
      if (mismoColindante(linderosA[punto], linderosB[punto])) {
        coincidencias.push(punto);
      } else {
        discrepancias.push(punto);
      }
    }

    // OK si TODOS los puntos comunes coinciden
    if (discrepancias.length === 0) {
      return {
        reglaId: 'R07', severity: 'ok',
        titulo: 'Coincidencia de linderos',
        descripcion: 'Los colindantes coinciden en los puntos cardinales comparables (' + coincidencias.length + ' de ' + puntosComunes.length + ').',
        docAId: escritura.id, docAField: 'Linderos',
        docAValue: puntosComunes.map((p) => p + ': ' + linderosA[p]).join(' | '),
        docBId: certificado.id, docBField: 'Linderos',
        docBValue: puntosComunes.map((p) => p + ': ' + linderosB[p]).join(' | '),
        razon: 'Los linderos referencian los mismos colindantes en cada punto cardinal (Art. 16 Par. 1 Ley 1579).',
      };
    }

    // REVIEW si hay discrepancias
    return {
      reglaId: 'R07', severity: 'review',
      titulo: 'Linderos con colindantes inconsistentes',
      descripcion: 'Se detectaron diferencias en los colindantes de ' + discrepancias.length + ' punto(s) cardinal(es).',
      docAId: escritura.id, docAField: 'Linderos',
      docAValue: discrepancias.map((p) => p + ': ' + linderosA[p]).join(' | '),
      docBId: certificado.id, docBField: 'Linderos',
      docBValue: discrepancias.map((p) => p + ': ' + linderosB[p]).join(' | '),
      razon: 'Verifica que los colindantes de los puntos ' + discrepancias.join(', ') + ' correspondan al mismo predio. Art. 31 Decreto 960 de 1970.',
    };
  },
};
