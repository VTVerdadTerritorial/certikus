import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

// ============================================================================
// R21 — Analisis de Gravamenes
// Fundamento: Art. 41-42 Ley 1579 de 2012 + Art. 2499-2511 C.C.
//             Ley 75 de 1986 (patrimonio de familia)
//             Ley 675 de 2001 (afectacion a vivienda familiar)
// ============================================================================
// Detecta gravamenes registrados (hipotecas, patrimonio de familia, usufructo,
// servidumbres, afectacion a vivienda familiar) y evalua si impiden vender.
// Los gravamenes se identifican por codigos 02xx en las anotaciones.
// ============================================================================

interface Gravamen {
  numero: number | null;
  codigo: string;
  tipo: string;
  descripcion: string;
  cancelado: boolean;
}

// Mapa de codigos 02xx a nombre de gravamen
const TIPOS_GRAVAMEN: Record<string, string> = {
  '0201': 'Hipoteca',
  '0202': 'Hipoteca',
  '0203': 'Hipoteca',
  '0204': 'Hipoteca',
  '0205': 'Patrimonio de familia',
  '0206': 'Afectacion a vivienda familiar',
  '0207': 'Usufructo',
  '0208': 'Servidumbre',
  '0209': 'Uso o habitacion',
  '0210': 'Fideicomiso',
};

// Palabras clave para detectar cancelacion
const PALABRAS_CANCELACION = [
  'cancelacion',
  'cancelada',
  'cancelado',
  'liberacion',
  'liberada',
  'liberado',
  'extincion',
  'extinguida',
  'extinguido',
  'se cancela',
];

// Gravamenes que impiden vender directamente (CRITICAL)
const GRAVAMENES_BLOQUEANTES = [
  'Hipoteca',
  'Patrimonio de familia',
  'Afectacion a vivienda familiar',
];

// Gravamenes que requieren revision (REVIEW)
const GRAVAMENES_REVISAR = [
  'Usufructo',
  'Servidumbre',
  'Uso o habitacion',
  'Fideicomiso',
];

export const R21_Gravamenes: Rule = {
  id: 'R21',
  nombre: 'Analisis de gravamenes',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { certificado } = ctx;
    if (!certificado) {
      return {
        reglaId: 'R21', severity: 'illegible',
        titulo: 'Analisis de gravamenes',
        descripcion: 'No se puede verificar sin el certificado de tradicion.',
        razon: 'Se requiere el certificado para conocer los gravamenes del inmueble.',
      };
    }

    const anotaciones = certificado.rawExtraction?.certificado?.anotaciones || [];
    if (anotaciones.length === 0) {
      return {
        reglaId: 'R21', severity: 'illegible',
        titulo: 'Sin anotaciones extraidas',
        descripcion: 'No se pudieron extraer las anotaciones del certificado.',
        razon: 'Verifica que el certificado sea legible y contenga anotaciones.',
      };
    }

    // 1. Extraer todos los gravamenes (codigos 02xx)
    const gravamenes: Gravamen[] = [];
    for (const a of anotaciones) {
      const codigo = (a.codigo_anotacion || '').trim();
      if (!codigo.startsWith('02')) continue;

      const descripcion = (a.descripcion || '') + ' ' + (a.descripcion_codigo || '');
      const descripcionLower = descripcion.toLowerCase();
      const cancelado = PALABRAS_CANCELACION.some((p) => descripcionLower.includes(p));
      const tipo = TIPOS_GRAVAMEN[codigo] || 'Gravamen ' + codigo;

      gravamenes.push({
        numero: a.numero_anotacion,
        codigo,
        tipo,
        descripcion: descripcion.substring(0, 200),
        cancelado,
      });
    }

    // 2. Si no hay gravamenes → OK
    if (gravamenes.length === 0) {
      return {
        reglaId: 'R21', severity: 'ok',
        titulo: 'Sin gravamenes registrados',
        descripcion: 'El folio de matricula no reporta hipotecas, patrimonio de familia, usufructo ni servidumbres.',
        docAId: certificado.id, docAField: 'Anotaciones',
        docAValue: anotaciones.length + ' anotaciones revisadas',
        razon: 'El inmueble no tiene gravamenes que limiten la libre disposicion.',
      };
    }

    // 3. Filtrar solo gravamenes ACTIVOS
    const activos = gravamenes.filter((g) => !g.cancelado);
    const cancelados = gravamenes.filter((g) => g.cancelado);

    // 4. Si todos estan cancelados → OK
    if (activos.length === 0) {
      return {
        reglaId: 'R21', severity: 'ok',
        titulo: 'Gravamenes cancelados',
        descripcion: 'Los ' + cancelados.length + ' gravamen(es) del folio fueron cancelados.',
        docAId: certificado.id, docAField: 'Gravamenes cancelados',
        docAValue: cancelados.map((g) => g.tipo).join(', '),
        razon: 'El inmueble esta libre de gravamenes activos.',
      };
    }

    // 5. Clasificar los gravamenes activos
    const bloqueantes = activos.filter((g) => GRAVAMENES_BLOQUEANTES.includes(g.tipo));
    const aRevisar = activos.filter((g) => GRAVAMENES_REVISAR.includes(g.tipo));

    // 6. Si hay gravamenes bloqueantes → CRITICAL
    if (bloqueantes.length > 0) {
      const detalles = bloqueantes
        .map((g) => g.tipo + ' (anotacion ' + g.numero + ')')
        .join(', ');
      return {
        reglaId: 'R21', severity: 'critical',
        titulo: 'Gravamenes activos impiden la venta',
        descripcion: 'El predio tiene ' + bloqueantes.length + ' gravamen(es) activo(s): ' + detalles + '.',
        docAId: certificado.id, docAField: 'Gravamenes activos',
        docAValue: detalles,
        razon: 'Los gravamenes activos (Art. 41-42 Ley 1579) limitan la libre disposicion del inmueble. Deben cancelarse o subsanarse antes de cualquier venta.',
      };
    }

    // 7. Si solo hay gravamenes de revision → REVIEW
    if (aRevisar.length > 0) {
      const detalles = aRevisar
        .map((g) => g.tipo + ' (anotacion ' + g.numero + ')')
        .join(', ');
      return {
        reglaId: 'R21', severity: 'review',
        titulo: 'Gravamenes que requieren revision',
        descripcion: 'El predio tiene ' + aRevisar.length + ' gravamen(es): ' + detalles + '.',
        docAId: certificado.id, docAField: 'Gravamenes',
        docAValue: detalles,
        razon: 'Estos gravamenes pueden afectar la libre disposicion del inmueble. Verifica con el titular antes de radicar (Art. 41-42 Ley 1579).',
      };
    }

    // 8. Fallback
    return {
      reglaId: 'R21', severity: 'ok',
      titulo: 'Gravamenes revisados',
      descripcion: 'Se revisaron ' + gravamenes.length + ' gravamen(es) sin hallazgos criticos.',
      docAId: certificado.id, docAField: 'Gravamenes',
      docAValue: gravamenes.length + ' gravamenes',
      razon: 'Los gravamenes del folio no impiden la libre disposicion.',
    };
  },
};
