import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

// ============================================================================
// R05 — Falsa tradición / Presunción de baldío
// Fundamento: Art. 8 Par. 3 y Art. 45 Ley 1579 de 2012
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

    const cert = certificado.rawExtraction?.certificado;
    const tieneFlagFalsaTradicion = cert?.anotacion_falsa_tradicion === true;
    const tieneEstadoFalsaTradicion = cert?.estado_folio === 'falsa_tradicion';

    // Analizar el array de anotaciones para contar cuántas tienen falsa tradición
    const anotaciones = cert?.anotaciones || [];
    const anotacionesConFalsaTradicion = anotaciones.filter((a: any) => {
      const natur = (a.naturaleza || '').toLowerCase();
      const desc = (a.descripcion || '').toLowerCase();
      const texto = natur + ' ' + desc;
      return (
        texto.includes('falsa tradici') ||
        texto.includes('derechos y acciones') ||
        texto.includes('compraventa de la posesion') ||
        texto.includes('adjudicacion en sucesion de la posesion') ||
        /\b6(07|08|10)\b/.test(texto)
      );
    });
    const totalAnotaciones = anotaciones.length;
    const hayFalsaTradicion =
      tieneFlagFalsaTradicion ||
      tieneEstadoFalsaTradicion ||
      anotacionesConFalsaTradicion.length > 0;
    const tienePresuncionBaldio = cert?.presuncion_baldio === true;

    // CASO 1: Falsa tradición detectada
    if (hayFalsaTradicion) {
      const detalle =
        anotacionesConFalsaTradicion.length > 0
          ? `Se detectaron ${anotacionesConFalsaTradicion.length} de ${totalAnotaciones} anotaciones con falsa tradición.`
          : 'El certificado reporta una anotación de falsa tradición.';

      return {
        reglaId: 'R05',
        severity: 'critical',
        titulo: 'Falsa tradición detectada',
        descripcion: detalle,
        docAId: certificado.id,
        docAField: 'Anotaciones',
        docAValue: `${anotacionesConFalsaTradicion.length} de ${totalAnotaciones} anotaciones`,
        razon:
          'La falsa tradición indica que el bien se transfirió sin antecedente propio o como enajenación de cosa ajena, sin que exista dominio pleno. Requiere análisis jurídico especializado antes de radicar (Art. 8 Par. 3 y Art. 45 Ley 1579 de 2012).',
      };
    }

    // CASO 2: Presunción de baldío detectada
    if (tienePresuncionBaldio) {
      return {
        reglaId: 'R05',
        severity: 'critical',
        titulo: 'Presunción de baldío',
        descripcion: 'El certificado reporta una anotación de PRESUNCIÓN DE BALDÍO.',
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
      descripcion: 'El certificado no reporta falsa tradición ni presunción de baldío.',
      docAId: certificado.id,
      docAField: 'Anotaciones',
      docAValue: `${totalAnotaciones} anotaciones sin falsa tradición`,
      razon: 'El folio está libre de estas restricciones.',
    };
  },
};