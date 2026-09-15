import { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import {
  uploadDocument,
  listCaseDocuments,
  downloadDocumentFile,
  deleteDocument,
  DocumentError,
} from '../services/document.service';
import type { JwtPayload } from '../types/auth.types';
import type { TipoDocumento } from '../types/document.types';

const tipoDocumentoSchema = z.enum([
  'escritura',
  'certificado',
  'cedula_vendedor',
  'cedula_comprador',
  'poder',
  'camara_comercio',
  'paz_salvo_predial',
  'paz_salvo_valorizacion',
  'certificado_catastral',
  'adicional',
]);

const MAX_FILE_SIZE = 20 * 1024 * 1024;

function handleError(err: unknown, res: Response) {
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: firstIssue.message,
        field: firstIssue.path.join('.'),
        timestamp: new Date().toISOString(),
      },
    });
  }
  if (err instanceof DocumentError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, timestamp: new Date().toISOString() },
    });
  }
  console.error('Error inesperado en documentos:', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrio un error inesperado.',
      timestamp: new Date().toISOString(),
    },
  });
}

function getUserId(req: Request): string | null {
  const user = req.user as JwtPayload | undefined;
  return user?.userId || null;
}

export async function upload(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No autenticado.' } });
      return;
    }

    const caseId = String(req.params.caseId);

    if (!req.file) {
      res.status(400).json({
        error: { code: 'NO_FILE', message: 'Debes subir un archivo PDF.', timestamp: new Date().toISOString() },
      });
      return;
    }
    if (req.file.mimetype !== 'application/pdf') {
      res.status(415).json({
        error: { code: 'INVALID_FILE_TYPE', message: 'Solo se permiten archivos PDF.', timestamp: new Date().toISOString() },
      });
      return;
    }
    if (req.file.size > MAX_FILE_SIZE) {
      res.status(413).json({
        error: { code: 'FILE_TOO_LARGE', message: 'El archivo excede el limite de 20 MB.', timestamp: new Date().toISOString() },
      });
      return;
    }

    const tipoResult = tipoDocumentoSchema.safeParse(req.body.tipo);
    if (!tipoResult.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_DOCUMENT_TYPE',
          message: `Tipo invalido. Permitidos: ${tipoDocumentoSchema.options.join(', ')}`,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const document = await uploadDocument(userId, {
      caseId,
      tipo: tipoResult.data as TipoDocumento,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      buffer: req.file.buffer,
    });

    res.status(201).json(document);
  } catch (err) {
    handleError(err, res);
  }
}

export async function list(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No autenticado.' } });
      return;
    }
    const caseId = String(req.params.caseId);
    const documents = await listCaseDocuments(userId, caseId);
    res.status(200).json({ total: documents.length, documents });
  } catch (err) {
    handleError(err, res);
  }
}

export async function download(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No autenticado.' } });
      return;
    }
    const id = String(req.params.id);
    const result = await downloadDocumentFile(userId, id);

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.filename)}"`
    );
    res.setHeader('Content-Length', result.buffer.length.toString());

    res.send(result.buffer);
  } catch (err) {
    handleError(err, res);
  }
}

export async function remove(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No autenticado.' } });
      return;
    }
    const id = String(req.params.id);
    const result = await deleteDocument(userId, id);
    res.status(200).json(result);
  } catch (err) {
    handleError(err, res);
  }
}