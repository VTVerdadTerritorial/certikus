import { Request, Response, NextFunction } from 'express';
import { analyzeCase, getCaseReport } from '../services/analysis.service';
import { generateReportPDF } from '../services/pdf.service';
import { DocumentError } from '../services/document.service';
import type { JwtPayload } from '../types/auth.types';

function handleError(err: unknown, res: Response) {
  if (err instanceof DocumentError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, timestamp: new Date().toISOString() },
    });
  }
  console.error('Error inesperado en analisis:', err);
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

export async function analyze(
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
    console.log(`[Controller] Iniciando analisis del caso: ${id}`);
    const result = await analyzeCase(userId, id);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    handleError(err, res);
  }
}

export async function getReport(
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
    const report = await getCaseReport(userId, id);
    res.status(200).json(report);
  } catch (err) {
    handleError(err, res);
  }
}

export async function downloadPDF(
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
    console.log(`[Controller] Generando PDF del caso: ${id}`);

    const report = await getCaseReport(userId, id);

    if (report.estado === 'PENDIENTE') {
      res.status(400).json({
        error: {
          code: 'REPORT_NOT_READY',
          message: 'El expediente aun no ha sido analizado.',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const pdfBuffer = await generateReportPDF(report);

    const safeName = report.nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="certikus-reporte-${safeName}.pdf"`
    );
    res.setHeader('Content-Length', pdfBuffer.length.toString());

    res.send(pdfBuffer);
  } catch (err) {
    handleError(err, res);
  }
}