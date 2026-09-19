import type { ExtractionResult } from './extraction.types';

// ============================================================================
// TIPOS DEL MOTOR DE REGLAS
// ============================================================================

export type Severity = 'critical' | 'review' | 'ok' | 'illegible';

export interface DocumentWithExtraction {
  id: string;
  tipo: string;
  filename: string;
  rawExtraction: ExtractionResult | null;
  extractionStatus: string;
}

export interface RuleContext {
  escritura: DocumentWithExtraction | null;
  certificado: DocumentWithExtraction | null;
  otrosDocumentos: DocumentWithExtraction[];
  tipoOperacion?: 'orip' | 'notaria' | 'titularidad' | null;
}

export interface RuleResult {
  reglaId: string;
  severity: Severity;
  titulo: string;
  descripcion: string;
  docAId?: string | null;
  docAPage?: number | null;
  docAField?: string | null;
  docAValue?: string | null;
  docBId?: string | null;
  docBPage?: number | null;
  docBField?: string | null;
  docBValue?: string | null;
  razon: string;
}

export interface Rule {
  id: string;
  nombre: string;
  evaluar: (ctx: RuleContext) => RuleResult;
}