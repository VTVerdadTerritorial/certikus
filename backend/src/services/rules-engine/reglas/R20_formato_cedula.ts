import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

// ============================================================================
// R20 — Validacion del formato de cedula para tramites notariales
// Fundamento: Decreto 1413 de 2017 + practica notarial colombiana
// ============================================================================
// La cedula digital (fisica de policarbonato o app movil) tiene validez
// juridica general, PERO muchos tramites notariales (escrituras, testamentos,
// matrimonios) aun exigen la cedula fisica amarilla con hologramas.
//
// Esta regla advierte al usuario para evitar que su expediente sea rechazado
// por un documento de identidad que la notaria no acepte.
// ============================================================================

const ACTOS_NOTARIALES_ESTRICTOS = [
  'compraventa', 'hipoteca', 'donacion', 'permuta', 'sucesion',
  'testamento', 'matrimonio', 'usufructo', 'servidumbre', 'fiducia',
];

export const R20_FormatoCedula: Rule = {
  id: 'R20',
  nombre: 'Formato de cedula para tramite notarial',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { escritura, otrosDocumentos } = ctx;

    // Recolectar TODAS las cedulas subidas (vendedor y comprador)
    const cedulas = otrosDocumentos.filter(
      (d) => d.tipo === 'cedula_vendedor' || d.tipo === 'cedula_comprador'
    );

    if (cedulas.length === 0) {
      return {
        reglaId: 'R20', severity: 'illegible',
        titulo: 'Formato de cedula',
        descripcion: 'No se aportaron cedulas para validar el formato.',
        razon: 'Se requieren cedulas de las partes para verificar el formato aceptado por la notaria.',
      };
    }

    // Determinar si el acto es notarial estricto
    const naturaleza = (
      escritura?.rawExtraction?.escritura?.naturaleza_acto || ''
    ).toLowerCase();
    const esActoEstricto = ACTOS_NOTARIALES_ESTRICTOS.some((a) =>
      naturaleza.includes(a)
    );

    // Recolectar tipos de cedula detectados
    const tiposDetectados: string[] = [];
    for (const c of cedulas) {
      const tipo = c.rawExtraction?.cedula?.tipo_cedula;
      if (tipo) tiposDetectados.push(tipo);
    }

    // Caso 1: Al menos una cedula es de la app movil en acto notarial estricto
    const tieneCedulaApp = tiposDetectados.includes('cedula_digital_app');
    if (tieneCedulaApp && esActoEstricto) {
      return {
        reglaId: 'R20', severity: 'critical',
        titulo: 'Cedula digital (app) no valida para este tramite notarial',
        descripcion: 'Se detecto una captura de la app "Cedula Digital Colombia". Este tipo de cedula no es aceptada por muchas notarias para actos como ' + (naturaleza || 'el tramite') + '.',
        razon: 'La mayoria de notarias exigen la cedula fisica (amarilla o de policarbonato) para actos notariales. La cedula digital de la app puede no ser aceptada. Sube la cedula fisica para evitar rechazo.',
      };
    }

    // Caso 2: Al menos una cedula es digital fisica (policarbonato) en acto notarial estricto
    const tieneCedulaDigitalFisica = tiposDetectados.includes('cedula_digital_fisica');
    if (tieneCedulaDigitalFisica && esActoEstricto) {
      return {
        reglaId: 'R20', severity: 'review',
        titulo: 'Cedula digital fisica - verificar aceptacion',
        descripcion: 'Se detecto una cedula digital en formato fisico (policarbonato). Aunque es valida legalmente, algunas notarias aun no la aceptan para todos los actos notariales.',
        razon: 'La cedula digital fisica tiene plena validez juridica (Decreto 1413 de 2017), pero verifica con la notaria antes de radicar.',
      };
    }

    // Caso 3: Todas amarillas (o no se pudo determinar) → OK
    const tieneAmarilla = tiposDetectados.includes('cedula_amarilla');
    if (tieneAmarilla || tiposDetectados.length === 0) {
      return {
        reglaId: 'R20', severity: 'ok',
        titulo: 'Formato de cedula valido',
        descripcion: tiposDetectados.length === 0
          ? 'No se pudo determinar el tipo de cedula, pero no se detectaron formatos digitales.'
          : 'La(s) cedula(s) aportada(s) son del formato fisico amarillo, aceptado por todas las notarias.',
        razon: 'El formato de cedula cumple con los requisitos de las notarias colombianas.',
      };
    }

    // Caso 4: Tipo desconocido → review
    return {
      reglaId: 'R20', severity: 'review',
      titulo: 'Formato de cedula no determinado',
      descripcion: 'No se pudo determinar el formato de la(s) cedula(s) aportada(s).',
      razon: 'Verifica manualmente que el formato de cedula sea aceptado por la notaria.',
    };
  },
};
