import type { Rule, RuleContext, RuleResult } from '../../types/rules.types';

// Reglas individuales R01-R07
import { R01_Matricula } from './reglas/R01_matricula';
import { R02_Titular } from './reglas/R02_titular';
import { R03_Area } from './reglas/R03_area';
import { R04_Vigencia } from './reglas/R04_vigencia';
import { R05_FalsaTradicion } from './reglas/R05_falsa_tradicion';
import { R06_Legibilidad } from './reglas/R06_legibilidad';
import { R07_Linderos } from './reglas/R07_linderos';

// Reglas consolidadas R08-R15
import {
  R08_TituloAntecedente,
  R09_NaturalezaActo,
  R10_DocsIdentidad,
  R11_CedulasConsistentes,
  R12_PorcentajeTitularidad,
  R13_NotariaValida,
  R14_AreaPositiva,
  R15_EstadoFolio,
} from './reglas/R08_R15_consolidadas';

// Nuevas reglas R16-R17
import { R16_IdentificacionInmueble } from './reglas/R16_identificacion_inmueble';
import { R17_PropiedadHorizontal } from './reglas/R17_propiedad_horizontal';

// ============================================================================
// CATÁLOGO COMPLETO DE REGLAS (R01 a R17)
// ============================================================================
export const ALL_RULES: Rule[] = [
  R01_Matricula,
  R02_Titular,
  R03_Area,
  R04_Vigencia,
  R05_FalsaTradicion,
  R06_Legibilidad,
  R07_Linderos,
  R08_TituloAntecedente,
  R09_NaturalezaActo,
  R10_DocsIdentidad,
  R11_CedulasConsistentes,
  R12_PorcentajeTitularidad,
  R13_NotariaValida,
  R14_AreaPositiva,
  R15_EstadoFolio,
  R16_IdentificacionInmueble,
  R17_PropiedadHorizontal,
];

// ============================================================================
// ORQUESTADOR: EJECUTA TODAS LAS REGLAS
// ============================================================================
export function ejecutarReglas(ctx: RuleContext): RuleResult[] {
  const resultados: RuleResult[] = [];
  for (const regla of ALL_RULES) {
    try {
      const resultado = regla.evaluar(ctx);
      resultados.push(resultado);
    } catch (err) {
      console.error(`Error ejecutando regla ${regla.id}:`, err);
      resultados.push({
        reglaId: regla.id,
        severity: 'illegible',
        titulo: `Error al ejecutar ${regla.nombre}`,
        descripcion: 'La regla no se pudo evaluar por un error técnico.',
        razon: err instanceof Error ? err.message : 'Error desconocido',
      });
    }
  }
  return resultados;
}

// ============================================================================
// CÁLCULO DEL ESTADO GLOBAL
// ============================================================================
export function calcularEstado(
  resultados: RuleResult[]
): 'CORREGIR' | 'REVISAR' | 'CONSISTENTE' {
  const criticals = resultados.filter((r) => r.severity === 'critical').length;
  const reviews = resultados.filter((r) => r.severity === 'review').length;
  if (criticals > 0) return 'CORREGIR';
  if (reviews > 0) return 'REVISAR';
  return 'CONSISTENTE';
}

export function calcularMetricas(resultados: RuleResult[]) {
  return {
    criticals: resultados.filter((r) => r.severity === 'critical').length,
    reviews: resultados.filter((r) => r.severity === 'review').length,
    oks: resultados.filter((r) => r.severity === 'ok').length,
    illegibles: resultados.filter((r) => r.severity === 'illegible').length,
    total: resultados.length,
  };
}