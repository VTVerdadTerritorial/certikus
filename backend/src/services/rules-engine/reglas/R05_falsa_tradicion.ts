import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

// ============================================================================
// R05 — Falsa tradicion / Presuncion de baldio
// Fundamento: Art. 8 Par. 3 y Art. 45 Ley 1579 de 2012
// ============================================================================
// Diferencia dos tipos de anotaciones que afectan el dominio:
//   - Falsa tradicion explicita (codigos 610/607/608 o texto "falsa tradicion")
//   - Transmision de posesion sin dominio (codigo 915, derechos y acciones)
// ============================================================================

export const R05_FalsaTradicion: Rule = {
  id: 'R05',
  nombre: 'Falsa tradicion',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { certificado } = ctx;

    if (!certificado) {
      return {
        reglaId: 'R05', severity: 'illegible',
        titulo: 'Verificacion de falsa tradicion',
        descripcion: 'No se puede verificar sin el certificado.',
        razon: 'Se requiere el certificado de tradicion.',
      };
    }

    const cert = certificado.rawExtraction?.certificado;
    const tieneFlagFalsaTradicion = cert?.anotacion_falsa_tradicion === true;
    const tieneEstadoFalsaTradicion = cert?.estado_folio === 'falsa_tradicion';
    const anotaciones = cert?.anotaciones || [];

    const falsaTradicionExplicita: any[] = [];
    const posesionSinDominio: any[] = [];

    anotaciones.forEach((a: any) => {
      const natur = (a.naturaleza || '').toLowerCase();
      const desc = (a.descripcion || '').toLowerCase();
      const texto = natur + ' ' + desc;

      const esFalsaTradicionExplicita =
        texto.includes('falsa tradici') || /\b6(07|08|10)\b/.test(texto);

      const esPosesionSinDominio =
        texto.includes('adjudicacion en sucesion de la posesion') ||
        texto.includes('compraventa de la posesion') ||
        texto.includes('derechos y acciones');

      if (esFalsaTradicionExplicita) {
        falsaTradicionExplicita.push(a);
      } else if (esPosesionSinDominio) {
        posesionSinDominio.push(a);
      }
    });

    const totalAnotaciones = anotaciones.length;
    const totalAfectadas = falsaTradicionExplicita.length + posesionSinDominio.length;
    const hayFalsaTradicion =
      tieneFlagFalsaTradicion ||
      tieneEstadoFalsaTradicion ||
      totalAfectadas > 0;
    const tienePresuncionBaldio = cert?.presuncion_baldio === true;

    if (hayFalsaTradicion) {
      const partes: string[] = [];
      if (falsaTradicionExplicita.length > 0) {
        partes.push(falsaTradicionExplicita.length + ' con falsa tradicion explicita (codigos 610/607/608)');
      }
      if (posesionSinDominio.length > 0) {
        partes.push(posesionSinDominio.length + ' con transmision de posesion sin dominio');
      }

      const detalle =
        partes.length > 0
          ? 'Se detectaron ' + totalAfectadas + ' de ' + totalAnotaciones + ' anotaciones que afectan el dominio: ' + partes.join(' y ') + '.'
          : 'El certificado reporta anotaciones de falsa tradicion.';

      return {
        reglaId: 'R05', severity: 'critical',
        titulo: 'Falsa tradicion detectada',
        descripcion: detalle,
        docAId: certificado.id, docAField: 'Anotaciones',
        docAValue: totalAfectadas + ' de ' + totalAnotaciones + ' anotaciones',
        razon: 'Las anotaciones con falsa tradicion o transmision de posesion indican que el bien no tiene dominio pleno. Requiere analisis juridico especializado antes de radicar (Art. 8 Par. 3 y Art. 45 Ley 1579 de 2012).',
      };
    }

    if (tienePresuncionBaldio) {
      return {
        reglaId: 'R05', severity: 'critical',
        titulo: 'Presuncion de baldio',
        descripcion: 'El certificado reporta una anotacion de PRESUNCION DE BALDIO.',
        docAId: certificado.id, docAField: 'Anotacion',
        docAValue: 'PRESUNCION DE BALDIO',
        razon: 'La presuncion de baldio implica que el predio podria pertenecer al Estado. Requiere verificacion ante la ANT antes de cualquier radicacion.',
      };
    }

    return {
      reglaId: 'R05', severity: 'ok',
      titulo: 'Sin falsa tradicion ni presuncion de baldio',
      descripcion: 'El certificado no reporta falsa tradicion ni presuncion de baldio.',
      docAId: certificado.id, docAField: 'Anotaciones',
      docAValue: totalAnotaciones + ' anotaciones sin falsa tradicion',
      razon: 'El folio esta libre de estas restricciones.',
    };
  },
};
