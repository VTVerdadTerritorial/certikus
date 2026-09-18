import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

// ============================================================================
// R22 — Analisis de Medidas Cautelares
// Fundamento: Art. 42 Ley 1579 de 2012 + Arts. 461, 590 CGP + Art. 2488 C.C.
// ============================================================================
// Detecta medidas cautelares registradas (embargos, demandas, secuestros,
// prohibiciones de enajenar) que impiden la libre disposicion del inmueble.
// Las medidas cautelares se identifican por codigos 04xx en las anotaciones.
// ============================================================================

interface MedidaCautelar {
  numero: number | null;
  codigo: string;
  tipo: string;
  descripcion: string;
  cancelada: boolean;
}

// Mapa de codigos 04xx a nombre de medida cautelar
const TIPOS_MEDIDA: Record<string, string> = {
  '0411': 'Demanda civil',
  '0412': 'Demanda',
  '0413': 'Demanda',
  '0421': 'Secuestro',
  '0422': 'Secuestro',
  '0427': 'Embargo ejecutivo',
  '0428': 'Embargo',
  '0429': 'Embargo',
  '0430': 'Embargo',
  '0441': 'Prohibicion de enajenar',
  '0442': 'Prohibicion de enajenar',
  '0451': 'Demanda ordinaria',
  '0452': 'Demanda ejecutiva',
  '0461': 'Medida cautelar',
  '0471': 'Afectacion por medida judicial',
};

// Palabras clave para detectar cancelacion/levantamiento
const PALABRAS_CANCELACION = [
  'cancelacion',
  'cancelada',
  'cancelado',
  'levantamiento',
  'levantada',
  'levantado',
  'desembargo',
  'desembargada',
  'desembargado',
  'terminacion',
  'terminada',
  'terminado',
  'se cancela',
  'se levanta',
];

export const R22_MedidasCautelares: Rule = {
  id: 'R22',
  nombre: 'Analisis de medidas cautelares',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { certificado } = ctx;
    if (!certificado) {
      return {
        reglaId: 'R22', severity: 'illegible',
        titulo: 'Analisis de medidas cautelares',
        descripcion: 'No se puede verificar sin el certificado de tradicion.',
        razon: 'Se requiere el certificado para conocer las medidas cautelares del inmueble.',
      };
    }

    const anotaciones = certificado.rawExtraction?.certificado?.anotaciones || [];
    if (anotaciones.length === 0) {
      return {
        reglaId: 'R22', severity: 'illegible',
        titulo: 'Sin anotaciones extraidas',
        descripcion: 'No se pudieron extraer las anotaciones del certificado.',
        razon: 'Verifica que el certificado sea legible y contenga anotaciones.',
      };
    }

    // 1. Extraer todas las medidas cautelares (codigos 04xx)
    const medidas: MedidaCautelar[] = [];
    for (const a of anotaciones) {
      const codigo = (a.codigo_anotacion || '').trim();
      if (!codigo.startsWith('04')) continue;

      const descripcion = (a.descripcion || '') + ' ' + (a.descripcion_codigo || '');
      const descripcionLower = descripcion.toLowerCase();
      const cancelada = PALABRAS_CANCELACION.some((p) => descripcionLower.includes(p));
      const tipo = TIPOS_MEDIDA[codigo] || 'Medida cautelar ' + codigo;

      medidas.push({
        numero: a.numero_anotacion,
        codigo,
        tipo,
        descripcion: descripcion.substring(0, 200),
        cancelada,
      });
    }

    // 2. Si no hay medidas → OK
    if (medidas.length === 0) {
      return {
        reglaId: 'R22', severity: 'ok',
        titulo: 'Sin medidas cautelares',
        descripcion: 'El folio de matricula no reporta embargos, demandas ni secuestros.',
        docAId: certificado.id, docAField: 'Anotaciones',
        docAValue: anotaciones.length + ' anotaciones revisadas',
        razon: 'El inmueble no tiene medidas cautelares que impidan su libre disposicion.',
      };
    }

    // 3. Filtrar solo las ACTIVAS
    const activas = medidas.filter((m) => !m.cancelada);
    const canceladas = medidas.filter((m) => m.cancelada);

    // 4. Si todas estan canceladas → OK
    if (activas.length === 0) {
      return {
        reglaId: 'R22', severity: 'ok',
        titulo: 'Medidas cautelares canceladas',
        descripcion: 'Las ' + canceladas.length + ' medida(s) cautelar(es) del folio fueron canceladas o levantadas.',
        docAId: certificado.id, docAField: 'Medidas canceladas',
        docAValue: canceladas.map((m) => m.tipo).join(', '),
        razon: 'El inmueble esta libre de medidas cautelares activas.',
      };
    }

    // 5. Si hay medidas activas → CRITICAL (todas las medidas cautelares bloquean)
    const detalles = activas
      .map((m) => m.tipo + ' (anotacion ' + m.numero + ')')
      .join(', ');

    return {
      reglaId: 'R22', severity: 'critical',
      titulo: 'Medidas cautelares activas impiden la venta',
      descripcion: 'El predio tiene ' + activas.length + ' medida(s) cautelar(es) activa(s): ' + detalles + '.',
      docAId: certificado.id, docAField: 'Medidas cautelares activas',
      docAValue: detalles,
      razon: 'Las medidas cautelares (Art. 42 Ley 1579) prohiben la enajenacion y bloquean cualquier registro. Deben cancelarse o levantarse antes de cualquier venta.',
    };
  },
};
