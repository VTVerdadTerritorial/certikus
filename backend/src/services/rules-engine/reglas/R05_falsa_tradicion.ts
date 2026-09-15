import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

// ============================================================================
// R05 — Falsa tradición
// Fundamento: Art. 8 Par. 3 Ley 1579 de 2012
// ============================================================================
// REGLA ESTRICTA: Solo reporta lo que dice textualmente el certificado.
// NO agrega interpretaciones jurídicas como "se presume baldío".
// ============================================================================

export const R05_FalsaTradicion: Rule = {
  id: 'R05',
  nombre: 'Falsa tradición',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { certificado } = ctx;

    if (!certificado) {
      return {
        reglaId: 'R05',
        severity: 'illegible',
        titulo: 'Verificación de falsa tradición',
        descripcion: 'No se puede verificar sin el certificado.',
        razon: 'Se requiere el certificado de tradición.',
      };
    }

    const tieneFalsaTradicion =
      certificado.rawExtraction?.certificado?.anotacion_falsa_tradicion === true ||
      certificado.rawExtraction?.certificado?.estado_folio === 'falsa_tradicion';

    const tienePresuncionBaldio =
      certificado.rawExtraction?.certificado?.presuncion_baldio === true;

    // CASO 1: Falsa tradición detectada
    if (tieneFalsaTradicion) {
      return {
        reglaId: 'R05',
        severity: 'critical',
        titulo: 'Falsa tradición detectada',
        descripcion:
          'El certificado reporta una anotación de FALSA TRADICIÓN en el folio de matrícula.',
        docAId: certificado.id,
        docAField: 'Anotación',
        docAValue: 'FALSA TRADICIÓN',
        razon:
          'La falsa tradición indica que el bien se transfirió sin antecedente propio o como enajenación de cosa ajena. Requiere análisis jurídico especializado antes de radicar (Art. 8 Par. 3 Ley 1579 de 2012).',
      };
    }

    // CASO 2: Presunción de baldío detectada
    if (tienePresuncionBaldio) {
      return {
        reglaId: 'R05',
        severity: 'critical',
        titulo: 'Presunción de baldío',
        descripcion:
          'El certificado reporta una anotación de PRESUNCIÓN DE BALDÍO.',
        docAId: certificado.id,
        docAField: 'Anotación',
        docAValue: 'PRESUNCIÓN DE BALDÍO',
        razon:
          'La presunción de baldío implica que el predio podría pertenecer al Estado. Requiere verificación ante la ANT (Agencia Nacional de Tierras) antes de cualquier radicación.',
      };
    }

    // CASO 3: Ninguna de las anteriores → CONSISTENTE
    return {
      reglaId: 'R05',
      severity: 'ok',
      titulo: 'Sin falsa tradición ni presunción de baldío',
      descripcion:
        'El certificado no reporta falsa tradición ni presunción de baldío.',
      docAId: certificado.id,
      docAField: 'Anotación',
      docAValue: 'Sin falsa tradición',
      razon: 'El folio está libre de estas restricciones.',
    };
  },
};