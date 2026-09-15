import { Request, Response, NextFunction } from 'express';
import { extractDataFromDocument } from '../services/gemini.service';
import { DocumentError } from '../services/document.service';
import type { JwtPayload } from '../types/auth.types';

function handleError(err: unknown, res: Response) {
  if (err instanceof DocumentError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        timestamp: new Date().toISOString(),
      },
    });
  }

  console.error('Error inesperado en extraccion:', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrio un error inesperado durante la extraccion.',
      timestamp: new Date().toISOString(),
    },
  });
}

function getUserId(req: Request): string | null {
  const user = req.user as JwtPayload | undefined;
  return user?.userId || null;
}

export async function extract(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'No autenticado.' },
      });
      return;
    }

    const id = String(req.params.id);

    console.log(`[Gemini] Iniciando extraccion del documento: ${id}`);
    const startTime = Date.now();

    const result = await extractDataFromDocument(userId, id);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Gemini] Extraccion completada en ${elapsed}s`);

    res.status(200).json({
      success: true,
      documentId: id,
      extractionTimeSeconds: parseFloat(elapsed),
      data: result,
    });
  } catch (err) {
    handleError(err, res);
  }
}