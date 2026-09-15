import type { Rule, RuleContext, RuleResult } from '../../types/rules.types';

// ============================================================================
// REGLAS DE ALTA CONFIANZA (10 reglas)
// ============================================================================
// Las reglas R02, R07, R10, R12, R13, R16 y R17 quedan desactivadas
// temporalmente hasta que se refinen sus algoritmos de comparación.
// Se reactivarán progresivamente con feedback de usuarios reales.
// ============================================================================

import { R01_Matricula } from './reglas/R01_matricula';
import { R03_Area } from './reglas/R03_area';
import { R04_Vigencia } from './reglas/R04_vigencia';
import { R05_FalsaTradicion } from './reglas/R05_falsa_tradicion';
import { R06_Legibilidad } from './reglas/R06_legibilidad';

import {
  R08_TituloAntecedente,
  R09_NaturalezaActo,
  R11_CedulasConsistentes,
  R14_AreaPositiva,
  R15_EstadoFolio,
} from './reglas/R08_R15_consolidadas';

export const ALL_RULES: Rule[] = [
  R01_Matricula,
  R03_Area,
  R04_Vigencia,
  R05_FalsaTradicion,
  R06_Legibilidad,
  R08_TituloAntecedente,
  R09_NaturalezaActo,
  R11_CedulasConsistentes,
  R14_AreaPositiva,
  R15_EstadoFolio,
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