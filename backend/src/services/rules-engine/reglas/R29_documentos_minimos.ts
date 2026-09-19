import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

// ============================================================================
// R29 — Validacion de documentos minimos segun el tipo de tramite
// Fundamento: Ley 1579 de 2012, Decreto 960 de 1970, Ley 160 de 1994
// ============================================================================
// Valida que los documentos minimos esten presentes segun el tramite elegido.
// NO bloquea — solo informa con severidad REVIEW que falta subir.
// ============================================================================

type TipoOperacion = 'orip' | 'notaria' | 'titularidad';

const DOCS_REQUERIDOS_POR_TRAMITE: Record<TipoOperacion, string[]> = {
  orip: [
    'escritura',
    'certificado',
    'cedula_vendedor',
    'cedula_comprador',
    'paz_salvo_predial',
  ],
  notaria: [
    'escritura',
    'certificado',
    'cedula_vendedor',
    'cedula_comprador',
  ],
  titularidad: [
    'escritura',
    'certificado',
    'cedula_vendedor',
  ],
};

const NOMBRES_AMIGABLES: Record<string, string> = {
  escritura: 'Escritura Publica',
  certificado: 'Certificado de Tradicion y Libertad',
  cedula_vendedor: 'Cedula del Vendedor',
  cedula_comprador: 'Cedula del Comprador',
  paz_salvo_predial: 'Paz y Salvo de Impuesto Predial',
  paz_salvo_valorizacion: 'Paz y Salvo de Valorizacion',
  certificado_catastral: 'Certificado Catastral',
  uso_suelo: 'Uso de Suelo',
};

const NOMBRES_TRAMITE: Record<TipoOperacion, string> = {
  orip: 'radicar en la Oficina de Registro de Instrumentos Publicos (ORIP)',
  notaria: 'escriturar en Notaria',
  titularidad: 'realizar el estudio de titulos',
};

export const R29_DocumentosMinimos: Rule = {
  id: 'R29',
  nombre: 'Documentos minimos segun tramite',
  evaluar: (ctx: RuleContext): RuleResult => {
    const tipo = ctx.tipoOperacion || 'orip';
    const requeridos = DOCS_REQUERIDOS_POR_TRAMITE[tipo] || DOCS_REQUERIDOS_POR_TRAMITE.orip;

    const documentosPresentes = new Set<string>();

    if (ctx.escritura) documentosPresentes.add('escritura');
    if (ctx.certificado) documentosPresentes.add('certificado');

    for (const d of ctx.otrosDocumentos) {
      documentosPresentes.add(d.tipo);
    }

    const faltantes: string[] = [];
    for (const req of requeridos) {
      if (!documentosPresentes.has(req)) {
        faltantes.push(NOMBRES_AMIGABLES[req] || req);
      }
    }

    if (faltantes.length === 0) {
      return {
        reglaId: 'R29',
        severity: 'ok',
        titulo: 'Documentos minimos completos',
        descripcion: 'Estan presentes los documentos requeridos para ' + NOMBRES_TRAMITE[tipo] + '.',
        razon: 'El expediente cumple con los documentos minimos exigidos por la normatividad colombiana.',
      };
    }

    const listado = faltantes.join(', ');
    const cantidad = faltantes.length;

    return {
      reglaId: 'R29',
      severity: 'review',
      titulo: 'Documentos recomendados faltantes',
      descripcion: 'Para ' + NOMBRES_TRAMITE[tipo] + ' se recomienda aportar: ' + listado + '.',
      razon: 'El expediente esta incompleto (' + cantidad + ' documento' + (cantidad > 1 ? 's' : '') + ' faltante' + (cantidad > 1 ? 's' : '') + '). Aportarlos evitara notas devolutivas o rechazos en la entidad correspondiente.',
    };
  },
};