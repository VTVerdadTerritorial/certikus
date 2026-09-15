import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

export const R05_FalsaTradicion: Rule = {
  id: 'R05',
  nombre: 'Falsa tradición',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { certificado } = ctx;
    if (!certificado) {
      return {
        reglaId: 'R05', severity: 'illegible',
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

    if (tieneFalsaTradicion || tienePresuncionBaldio) {
      return {
        reglaId: 'R05', severity: 'critical',
        titulo: 'Falsa tradición o presunción de baldío',
        descripcion: 'El certificado reporta FALSA TRADICIÓN o PRESUNCIÓN DE BALDÍO.',
        docAId: certificado.id, docAField: 'Anotación',
        docAValue: tieneFalsaTradicion
          ? 'Falsa tradición — se presume baldío'
          : 'Presunción de baldío',
        razon: 'Requiere análisis jurídico especializado antes de radicar (Art. 8 Par. 3 Ley 1579 de 2012).',
      };
    }
    return {
      reglaId: 'R05', severity: 'ok',
      titulo: 'Verificación de falsa tradición',
      descripcion: 'El certificado no reporta falsa tradición ni presunción de baldío.',
      docAId: certificado.id, docAField: 'Anotación',
      docAValue: 'Sin falsa tradición',
      razon: 'El folio está libre de esta restricción.',
    };
  },
};