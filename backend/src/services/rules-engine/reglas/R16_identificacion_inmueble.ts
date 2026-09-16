import type { Rule, RuleContext, RuleResult } from '../../../types/rules.types';

// ============================================================================
// R16 — Verificación de Identificación del Inmueble en Escritura
// Fundamento: Art. 16 Par. 1 Ley 1579 de 2012 + Decreto-Ley 960 de 1970
// ============================================================================

function normalizarDireccion(dir: string): string {
  return dir
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Palabras que NO aportan valor para comparar direcciones (artículos,
// preposiciones, conectores). Ej: "LAS PIEDRAS O GUINDAS" → {piedras, guindas}
const PALABRAS_DIRECCION_IGNORADAS = new Set([
  'de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'o', 'u',
  'en', 'con', 'por', 'para', 'al', 'a', 'un', 'una', 'unos', 'unas',
  'vereda', 'municipio', 'corregimiento', 'seccion', 'sector',
  'departamento', 'calle', 'carrera', 'cra', 'cl', 'av', 'avenida',
  'diagonal', 'transversal', 'km', 'kilometro', 'numero', 'no',
]);

function tokensDireccion(dir: string): Set<string> {
  const normalizado = normalizarDireccion(dir);
  return new Set(
    normalizado
      .split(' ')
      .filter((p) => p.length > 2 && !PALABRAS_DIRECCION_IGNORADAS.has(p))
  );
}

// Determina si dos direcciones se refieren al mismo lugar.
// Criterio: al menos 1 token significativo en común.
// Esto tolera variaciones como:
//   "LAS PIEDRAS O GUINDAS" vs "LAS PIEDRAS"  → comparten "piedras"
//   "VEREDA SAN ANTONIO, BUESACO" vs "SAN ANTONIO" → comparten "antonio"
function sonMismaDireccion(a: string, b: string): boolean {
  const tokensA = tokensDireccion(a);
  const tokensB = tokensDireccion(b);
  // Si alguno no tiene tokens (direcciones muy cortas), comparar normalizado exacto
  if (tokensA.size === 0 || tokensB.size === 0) {
    return normalizarDireccion(a) === normalizarDireccion(b);
  }
  for (const t of tokensA) {
    if (tokensB.has(t)) return true;
  }
  return false;
}

export const R16_IdentificacionInmueble: Rule = {
  id: 'R16',
  nombre: 'Identificación del inmueble en escritura',
  evaluar: (ctx: RuleContext): RuleResult => {
    const { escritura, certificado } = ctx;

    if (!escritura) {
      return {
        reglaId: 'R16',
        severity: 'illegible',
        titulo: 'Identificación del inmueble',
        descripcion: 'No se puede verificar sin la escritura pública.',
        razon: 'Se requiere la escritura para validar la identificación del inmueble.',
      };
    }

    const esc = escritura.rawExtraction?.escritura;
    if (!esc) {
      return {
        reglaId: 'R16',
        severity: 'illegible',
        titulo: 'Identificación del inmueble',
        descripcion: 'No se pudo extraer la información del inmueble de la escritura.',
        docAId: escritura.id,
        razon: 'La escritura no contiene datos legibles del inmueble.',
      };
    }

    const problemas: string[] = [];

    if (!esc.direccion_inmueble || esc.direccion_inmueble.trim().length < 5) {
      problemas.push('Dirección/nomenclatura no identificada');
    }

    if (esc.area_m2 === null || esc.area_m2 <= 0) {
      problemas.push('Área no identificada o inválida');
    }

    if (!esc.linderos || esc.linderos.trim().length < 10) {
      problemas.push('Linderos no identificados');
    }

    if (!esc.tipo_inmueble) {
      problemas.push('Tipo de inmueble (urbano/rural) no identificado');
    }

    if (certificado && esc.direccion_inmueble) {
      const certDir = certificado.rawExtraction?.certificado?.direccion_inmueble;
      if (certDir && !sonMismaDireccion(esc.direccion_inmueble, certDir)) {
        problemas.push(
          `Direcciones diferentes: Escritura "${esc.direccion_inmueble}" vs Certificado "${certDir}"`
        );
      }
    }

    if (esc.cedula_catastral) {
      const formatoValido = /^[0-9A-Z]{10,30}$/i.test(esc.cedula_catastral.replace(/[- ]/g, ''));
      if (!formatoValido) {
        problemas.push('Cédula catastral con formato inválido');
      }
    }

    if (problemas.length === 0) {
      return {
        reglaId: 'R16',
        severity: 'ok',
        titulo: 'Identificación del inmueble',
        descripcion: 'El inmueble está plenamente identificado en la escritura.',
        docAId: escritura.id,
        docAField: 'Dirección / Área / Linderos',
        docAValue: `${esc.direccion_inmueble || '-'} | ${esc.area_m2 || '-'} m² | ${esc.tipo_inmueble || '-'}`,
        razon: 'Se cumple con el Art. 16 Par. 1 de la Ley 1579 de 2012.',
      };
    }

    return {
      reglaId: 'R16',
      severity: problemas.length >= 3 ? 'critical' : 'review',
      titulo: 'Identificación incompleta del inmueble',
      descripcion: `Se detectaron ${problemas.length} problema(s) en la identificación del inmueble.`,
      docAId: escritura.id,
      docAField: 'Dirección / Área / Linderos',
      docAValue: esc.direccion_inmueble || 'NO DETECTADO',
      razon: problemas.join(' | ') + '. El Art. 16 Par. 1 exige que el inmueble esté plenamente identificado por matrícula, nomenclatura o linderos, área en sistema métrico decimal.',
    };
  },
};