export type TipoDocumento =
  | 'escritura'
  | 'certificado'
  | 'cedula_vendedor'
  | 'cedula_comprador'
  | 'poder'
  | 'camara_comercio'
  | 'paz_salvo_predial'
  | 'paz_salvo_valorizacion'
  | 'certificado_catastral'
  | 'adicional';

export type ExtractionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface DocumentResponse {
  id: string;
  caseId: string;
  tipo: TipoDocumento;
  filename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  extractionStatus: ExtractionStatus;
  extractionConfidence: number | null;
  uploadedAt: Date;
}

export interface UploadDocumentInput {
  caseId: string;
  tipo: TipoDocumento;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
}