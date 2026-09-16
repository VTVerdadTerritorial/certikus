import type { Rule, RuleContext, RuleResult } from '../../types/rules.types';

// ============================================================================
// CERTIKUS v1.0 — Núcleo de 12 reglas activas
// ============================================================================
// Activas (12): R01, R02, R03, R04, R05, R06, R07, R08, R09, R10, R13, R16
// Diferidas (5): R11, R12, R14, R15, R17
// Las diferidas se activarán tras el piloto real con feedback de usuarios.
// ============================================================================

import { R01_Matricula } from './reglas/R01_matricula';
import { R02_Titular } from './reglas/R02_titular';
import { R03_Area } from './reglas/R03_area';
import { R04_Vigencia } from './reglas/R04_vigencia';
import { R05_FalsaTradicion } from './reglas/R05_falsa_tradicion';
import { R06_Legibilidad } from './reglas/R06_legibilidad';
import { R07_Linderos } from './reglas/R07_linderos';

import {
  R08_TituloAntecedente,
  R09_NaturalezaActo,
  R10_DocsIdentidad,
  R13_NotariaValida,
} from './reglas/R08_R15_consolidadas';

import { R16_IdentificacionInmueble } from './reglas/R16_identificacion_inmueble';

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
  R13_NotariaValida,
  R16_IdentificacionInmueble,
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