import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

// ============================================================================
// R07 — Coincidencia de linderos
// Fundamento: Art. 16 Par. 1 Ley 1579 de 2012 + Art. 31 Decreto 960 de 1970
// ============================================================================
// Compara los linderos por PALABRAS SIGNIFICATIVAS (nombres de colindantes y
// toponimos), normalizando previamente los sinonimos notariales a puntos
// cardinales. Esto alinea la nomenclatura rural (cabecera/pie/derecho/izquierdo)
// con la nomenclatura estandar (norte/sur/oriente/occidente).
// ============================================================================

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,;:()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Mapa de sinonimos notariales -> punto cardinal canonico.
// Segun la practica rural colombiana (IGAC):
//   - Cabecera (frente) = Norte
//   - Pie (base) = Sur
//   - Derecho (mano derecha) = Oriente
//   - Izquierdo (mano izquierda) = Occidente
const SINONIMOS_CARDINALES: Record<string, string> = {
  norte: 'norte',
  cabecera: 'norte',
  pie: 'sur',
  sur: 'sur',
  oriente: 'oriente',
  este: 'oriente',
  'costado derecho': 'oriente',
  'lado derecho': 'oriente',
  derecho: 'oriente',
  occidente: 'occidente',
  oeste: 'occidente',
  'costado izquierdo': 'occidente',
  'lado izquierdo': 'occidente',
  izquierdo: 'occidente',
};

// Aplica el mapa de sinonimos a un texto de linderos.
function normalizarLinderos(texto: string): string {
  let t = normalizar(texto);
  for (const [sinonimo, cardinal] of Object.entries(SINONIMOS_CARDINALES)) {
    // Usamos una expresion regular con limites de palabra para evitar
    // coincidencias parciales (ej. "pie" dentro de "propiedades").
    const regex = new RegExp(`\\b${sinonimo}\\b`, 'g');
    t = t.replace(regex, cardinal);
  }
  return t;
}

const STOP_WORDS = new Set([
  'de','del','la','las','los','el','y','e','o','u','a','al','con','por',
  'para','en','un','una','uno','sin','sobre','entre','bajo','como','que',
  'norte','sur','oriente','occidente','este','oeste',
  'derecho','izquierdo','costado','lado','punto','extremo',
  'mismo','misma','indicado','indicada','propiedades','propiedad',
  'senalado','senalada','referido','referida','citado','citada',
  'aquel','aquella','dicho','dicha',
  'zanjon','zanja','alambre','cerca','muro','tapia','via','carretera',
  'camino','rio','quebrada','arroyo','canal','acequia','linea','faja',
  'franja','zanj',
  'medio','primero','luego','hasta','llegar','empezando','continua',
  'termina','cierra','todo','poco','mas','menos','otro','otra',
  'seccion','sector','vereda','municipio','departamento','jurisdiccion',
  'corregimiento','inspeccion',
  'lote','terreno','predio','parcela','finca','denominado','denominada',
  'llamado','llamada','conocido','conocida','actualidad','ubicado',
  'ubicada','comprendido','comprendida','dentro','siguientes','linderos',
  'generales','extension','aproximada','aproximado','cabida',
  'hectarea','hectareas','metro','metros','cuadrado','cuadrados',
  'centimetro','centimetros','superficie','area','poligono',
  'superior','inferior','interior','exterior','principal','secundario',
  'colinda','linda','limita','confina','contiguo','contigua',
]);

function palabrasSignificativas(texto: string): Set<string> {
  const t = normalizar(texto);
  return new Set(
    t.split(/\s+/).filter((p) => p.length > 2 && !STOP_WORDS.has(p))
  );
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

    if (!linderosEscritura && !linderosCertificado) {
      return {
        reglaId: 'R07', severity: 'critical',
        titulo: 'Linderos no identificados en ningun documento',
        descripcion: 'Ni la escritura ni el certificado contienen linderos del inmueble.',
        docAId: escritura.id, docAField: 'Linderos',
        docAValue: 'NO DETECTADO',
        docBId: certificado.id, docBField: 'Linderos',
        docBValue: 'NO DETECTADO',
        razon: 'El Art. 16 Par. 1 de la Ley 1579 exige que el inmueble este identificado por linderos.',
      };
    }

    if (!linderosEscritura || !linderosCertificado) {
      return {
        reglaId: 'R07', severity: 'review',
        titulo: 'Linderos incompletos',
        descripcion: 'Solo uno de los dos documentos contiene linderos del inmueble.',
        docAId: escritura.id, docAField: 'Linderos',
        docAValue: linderosEscritura ? linderosEscritura.substring(0, 200) : 'NO DETECTADO',
        docBId: certificado.id, docBField: 'Linderos',
        docBValue: linderosCertificado ? linderosCertificado.substring(0, 200) : 'NO DETECTADO',
        razon: 'Se recomienda contar con linderos en ambos documentos para validar la delimitacion (Art. 16 Par. 1 Ley 1579).',
      };
    }

    // Normalizar los linderos aplicando el mapa de sinonimos notariales
    const linderosNormA = normalizarLinderos(linderosEscritura);
    const linderosNormB = normalizarLinderos(linderosCertificado);

    const palabrasA = palabrasSignificativas(linderosNormA);
    const palabrasB = palabrasSignificativas(linderosNormB);

    const comunes = [...palabrasA].filter((p) => palabrasB.has(p));
    const soloEnEscritura = [...palabrasA].filter((p) => !palabrasB.has(p));
    const soloEnCertificado = [...palabrasB].filter((p) => !palabrasA.has(p));

    const PALABRAS_UBICACION = new Set([
      'piedras', 'guindas', 'gindas', 'antonio', 'buesaco', 'narino',
      'pasto', 'seccion', 'actualidad',
    ]);
    const colindantesSoloEscritura = soloEnEscritura.filter((p) => !PALABRAS_UBICACION.has(p));
    const colindantesSoloCertificado = soloEnCertificado.filter((p) => !PALABRAS_UBICACION.has(p));

    if (colindantesSoloEscritura.length > 0 || colindantesSoloCertificado.length > 0) {
      const detalles = [];
      if (colindantesSoloEscritura.length > 0) {
        detalles.push('En escritura pero no en certificado: ' + colindantesSoloEscritura.join(', '));
      }
      if (colindantesSoloCertificado.length > 0) {
        detalles.push('En certificado pero no en escritura: ' + colindantesSoloCertificado.join(', '));
      }
      return {
        reglaId: 'R07', severity: 'review',
        titulo: 'Colindantes no coincidentes',
        descripcion: 'Los linderos tienen colindantes que aparecen en un documento pero no en el otro.',
        docAId: escritura.id, docAField: 'Linderos',
        docAValue: linderosEscritura.substring(0, 200),
        docBId: certificado.id, docBField: 'Linderos',
        docBValue: linderosCertificado.substring(0, 200),
        razon: 'Verifica que los colindantes sean los mismos en ambos documentos. ' + detalles.join('. ') + ' (Art. 31 Decreto 960 de 1970).',
      };
    }


    // Criterio: >= 2 palabras significativas comunes (tipicamente nombre + apellido
    // de un colindante) indican que es el mismo predio. NO usamos Jaccard porque
    // castiga los documentos con texto adicional legitimo (descripcion, otros
    // colindantes), y en zonas rurales un colindante puede aparecer en varios puntos.
    if (comunes.length >= 2) {
      return {
        reglaId: 'R07', severity: 'ok',
        titulo: 'Coincidencia de linderos',
        descripcion: 'Los linderos referencian los mismos colindantes (' + comunes.length + ' coincidencia(s): ' + comunes.slice(0, 5).join(', ') + ').',
        docAId: escritura.id, docAField: 'Linderos',
        docAValue: linderosEscritura.substring(0, 200),
        docBId: certificado.id, docBField: 'Linderos',
        docBValue: linderosCertificado.substring(0, 200),
        razon: 'Los linderos referencian los mismos colindantes (Art. 16 Par. 1 Ley 1579).',
      };
    }

    if (comunes.length === 1) {
      return {
        reglaId: 'R07', severity: 'review',
        titulo: 'Linderos con coincidencia parcial',
        descripcion: 'Los linderos comparten ' + comunes.length + ' palabra(s) significativa(s): ' + comunes.slice(0, 5).join(', ') + '.',
        docAId: escritura.id, docAField: 'Linderos',
        docAValue: linderosEscritura.substring(0, 200),
        docBId: certificado.id, docBField: 'Linderos',
        docBValue: linderosCertificado.substring(0, 200),
        razon: 'Verifica manualmente que ambos documentos describan el mismo predio. Art. 31 Decreto 960 de 1970.',
      };
    }

    return {
      reglaId: 'R07', severity: 'critical',
      titulo: 'Linderos sin coincidencias',
      descripcion: 'Los linderos de la escritura y el certificado no comparten ningun colindante.',
      docAId: escritura.id, docAField: 'Linderos',
      docAValue: linderosEscritura.substring(0, 200),
      docBId: certificado.id, docBField: 'Linderos',
      docBValue: linderosCertificado.substring(0, 200),
      razon: 'Los linderos no refieren al mismo predio. Verifica antes de radicar (Art. 16 Par. 1 Ley 1579).',
    };
  },
};
