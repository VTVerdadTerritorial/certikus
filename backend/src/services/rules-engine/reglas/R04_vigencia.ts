import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

const DIAS_VIGENCIA_CERTIFICADO = 30;

export const R04_Vigencia: Rule = {
  id: 'R04',
  nombre: 'Vigencia del certificado',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { certificado } = ctx;
    if (!certificado) {
      return {
        reglaId: 'R04', severity: 'illegible',
        titulo: 'Vigencia del certificado',
        descripcion: 'No se puede verificar la vigencia sin el certificado.',
        razon: 'Se requiere el certificado de tradición para esta validación.',
      };
    }
    const fechaExpedicion =
      certificado.rawExtraction?.certificado?.fecha_expedicion ||
      certificado.rawExtraction?.fecha_documento || null;
    if (!fechaExpedicion) {
      return {
        reglaId: 'R04', severity: 'illegible',
        titulo: 'Vigencia del certificado',
        descripcion: 'No se pudo extraer la fecha de expedición del certificado.',
        docAId: certificado.id, docAField: 'Fecha de expedición',
        docAValue: 'NO DETECTADO',
        razon: 'Sin fecha de expedición no se puede validar la vigencia.',
      };
    }
    const fechaExp = new Date(fechaExpedicion);
    const hoy = new Date();
    const diasTranscurridos = Math.floor(
      (hoy.getTime() - fechaExp.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (isNaN(diasTranscurridos)) {
      return {
        reglaId: 'R04', severity: 'illegible',
        titulo: 'Vigencia del certificado',
        descripcion: 'La fecha del certificado tiene un formato inválido.',
        docAId: certificado.id, docAField: 'Fecha de expedición',
        docAValue: fechaExpedicion,
        razon: 'No se pudo parsear la fecha del certificado.',
      };
    }
    if (diasTranscurridos <= DIAS_VIGENCIA_CERTIFICADO) {
      return {
        reglaId: 'R04', severity: 'ok',
        titulo: 'Vigencia del certificado',
        descripcion: `El certificado tiene ${diasTranscurridos} días de expedición. Está vigente.`,
        docAId: certificado.id, docAField: 'Fecha de expedición',
        docAValue: fechaExpedicion,
        razon: `Vigencia de ${DIAS_VIGENCIA_CERTIFICADO} días respetada (Art. 72 Ley 1579).`,
      };
    }
    return {
      reglaId: 'R04', severity: 'critical',
      titulo: 'Certificado de tradición vencido',
      descripcion: `El certificado tiene ${diasTranscurridos} días de expedición, superando el límite de ${DIAS_VIGENCIA_CERTIFICADO} días.`,
      docAId: certificado.id, docAField: 'Fecha de expedición',
      docAValue: fechaExpedicion,
      razon: 'Se debe solicitar un certificado actualizado antes de radicar.',
    };
  },
};