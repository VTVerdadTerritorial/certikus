// ============================================================================
// TIPOS DE CASOS (EXPEDIENTES)
// ============================================================================

export type EstadoCaso = 'draft' | 'analyzing' | 'completed' | 'failed';

export type TipoOperacion =
  | 'compraventa'
  | 'hipoteca'
  | 'sucesion'
  | 'donacion'
  | 'permuta'
  | 'propiedad_horizontal'
  | 'otro'
  | 'orip'
  | 'notaria'
  | 'titularidad';

export interface CreateCaseInput {
  nombre: string;
  tipoOperacion?: TipoOperacion;
}

export interface UpdateCaseInput {
  nombre?: string;
  tipoOperacion?: TipoOperacion;
}

export interface CaseResponse {
  id: string;
  userId: string;
  nombre: string;
  tipoOperacion: string | null;
  estado: EstadoCaso;
  consistencia: number | null;
  criticals: number;
  reviews: number;
  oks: number;
  createdAt: Date;
  updatedAt: Date;
  stats?: {
    totalDocumentos: number;
    totalHallazgos: number;
  };
}