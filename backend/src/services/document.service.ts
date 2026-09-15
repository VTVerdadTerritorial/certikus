import { prisma } from '../config/database';
import { bucket, generateSignedUrl } from '../config/storage';
import type {
  DocumentResponse,
  TipoDocumento,
  ExtractionStatus,
  UploadDocumentInput,
} from '../types/document.types';

// ============================================================================
// ERRORES PERSONALIZADOS
// ============================================================================
export class DocumentError extends Error {
  code: string;
  statusCode: number;
  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'DocumentError';
  }
}

// ============================================================================
// HELPERS
// ============================================================================
function toDocumentResponse(doc: {
  id: string;
  caseId: string;
  tipo: string;
  filename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: bigint;
  extractionStatus: string;
  extractionConfidence: number | null;
  uploadedAt: Date;
}): DocumentResponse {
  return {
    id: doc.id,
    caseId: doc.caseId,
    tipo: doc.tipo as TipoDocumento,
    filename: doc.filename,
    storagePath: doc.storagePath,
    mimeType: doc.mimeType,
    sizeBytes: Number(doc.sizeBytes),
    extractionStatus: doc.extractionStatus as ExtractionStatus,
    extractionConfidence: doc.extractionConfidence,
    uploadedAt: doc.uploadedAt,
  };
}

async function verifyCaseOwnership(caseId: string, userId: string) {
  const caseData = await prisma.case.findUnique({
    where: { id: caseId },
    select: { id: true, userId: true },
  });
  if (!caseData) {
    throw new DocumentError('CASE_NOT_FOUND', 'Expediente no encontrado.', 404);
  }
  if (caseData.userId !== userId) {
    throw new DocumentError(
      'FORBIDDEN',
      'No tienes permiso para acceder a este expediente.',
      403
    );
  }
  return caseData;
}

// ============================================================================
// SERVICIO: SUBIR DOCUMENTO
// ============================================================================
export async function uploadDocument(
  userId: string,
  input: UploadDocumentInput
): Promise<DocumentResponse> {
  await verifyCaseOwnership(input.caseId, userId);

  const timestamp = Date.now();
  const safeFilename = input.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `cases/${input.caseId}/${input.tipo}-${timestamp}-${safeFilename}`;

  try {
    const file = bucket.file(storagePath);
    await file.save(input.buffer, {
      contentType: input.mimeType,
      metadata: {
        originalName: input.filename,
        caseId: input.caseId,
        userId,
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Error subiendo a Cloud Storage:', err);
    throw new DocumentError(
      'STORAGE_ERROR',
      'Error al subir el archivo al almacenamiento.',
      500
    );
  }

  const document = await prisma.document.create({
    data: {
      caseId: input.caseId,
      tipo: input.tipo,
      filename: input.filename,
      storagePath,
      mimeType: input.mimeType,
      sizeBytes: BigInt(input.sizeBytes),
      extractionStatus: 'pending',
      extractionConfidence: null,
    },
  });

  return toDocumentResponse(document);
}

// ============================================================================
// SERVICIO: LISTAR DOCUMENTOS DE UN CASO
// ============================================================================
export async function listCaseDocuments(
  userId: string,
  caseId: string
): Promise<DocumentResponse[]> {
  await verifyCaseOwnership(caseId, userId);
  const documents = await prisma.document.findMany({
    where: { caseId },
    orderBy: { uploadedAt: 'desc' },
  });
  return documents.map(toDocumentResponse);
}

// ============================================================================
// SERVICIO: OBTENER URL FIRMADA DE DESCARGA
// (legacy, no funciona en Cloud Shell sin service account key)
// ============================================================================
export async function getDocumentDownloadUrl(
  userId: string,
  documentId: string
): Promise<{ url: string; expiresIn: number }> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { case: { select: { userId: true } } },
  });
  if (!document) {
    throw new DocumentError('DOCUMENT_NOT_FOUND', 'Documento no encontrado.', 404);
  }
  if (document.case.userId !== userId) {
    throw new DocumentError(
      'FORBIDDEN',
      'No tienes permiso para acceder a este documento.',
      403
    );
  }

  const expirationMinutes = 60;
  const url = await generateSignedUrl(document.storagePath, expirationMinutes);
  return { url, expiresIn: expirationMinutes * 60 };
}

// ============================================================================
// SERVICIO: DESCARGAR DOCUMENTO (stream directo desde Cloud Storage)
// ============================================================================
export async function downloadDocumentFile(
  userId: string,
  documentId: string
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { case: { select: { userId: true } } },
  });

  if (!document) {
    throw new DocumentError('DOCUMENT_NOT_FOUND', 'Documento no encontrado.', 404);
  }

  if (document.case.userId !== userId) {
    throw new DocumentError(
      'FORBIDDEN',
      'No tienes permiso para acceder a este documento.',
      403
    );
  }

  try {
    const file = bucket.file(document.storagePath);
    const [buffer] = await file.download();
    return {
      buffer,
      filename: document.filename,
      mimeType: document.mimeType,
    };
  } catch (err) {
    console.error('Error descargando de Cloud Storage:', err);
    throw new DocumentError(
      'STORAGE_ERROR',
      'Error al descargar el archivo.',
      500
    );
  }
}

// ============================================================================
// SERVICIO: ELIMINAR DOCUMENTO
// ============================================================================
export async function deleteDocument(
  userId: string,
  documentId: string
): Promise<{ message: string }> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { case: { select: { userId: true } } },
  });
  if (!document) {
    throw new DocumentError('DOCUMENT_NOT_FOUND', 'Documento no encontrado.', 404);
  }
  if (document.case.userId !== userId) {
    throw new DocumentError(
      'FORBIDDEN',
      'No tienes permiso para acceder a este documento.',
      403
    );
  }

  try {
    await bucket.file(document.storagePath).delete();
  } catch (err) {
    console.warn('Error eliminando de Cloud Storage:', err);
  }

  await prisma.document.delete({ where: { id: documentId } });
  return { message: 'Documento eliminado correctamente.' };
}