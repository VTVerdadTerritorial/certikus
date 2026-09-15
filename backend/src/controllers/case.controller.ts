import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { createCaseSchema, updateCaseSchema } from '../utils/caseValidators';
import {
  createCase,
  listUserCases,
  getCaseById,
  updateCase,
  deleteCase,
  CaseError,
} from '../services/case.service';
import type { JwtPayload } from '../types/auth.types';

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
  if (err instanceof CaseError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, timestamp: new Date().toISOString() },
    });
  }
  console.error('Error inesperado en casos:', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrio un error inesperado.',
      timestamp: new Date().toISOString(),
    },
  });
}

export async function create(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  try {
    const user = req.user as JwtPayload | undefined;
    if (!user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No autenticado.' } });
      return;
    }
    const validated = createCaseSchema.parse(req.body);
    const newCase = await createCase(user.userId, validated);
    res.status(201).json(newCase);
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
    const user = req.user as JwtPayload | undefined;
    if (!user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No autenticado.' } });
      return;
    }
    const cases = await listUserCases(user.userId);
    res.status(200).json({ total: cases.length, cases });
  } catch (err) {
    handleError(err, res);
  }
}

export async function getOne(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  try {
    const user = req.user as JwtPayload | undefined;
    if (!user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No autenticado.' } });
      return;
    }
    const id = String(req.params.id);
    const caseData = await getCaseById(id, user.userId);
    res.status(200).json(caseData);
  } catch (err) {
    handleError(err, res);
  }
}

export async function update(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  try {
    const user = req.user as JwtPayload | undefined;
    if (!user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No autenticado.' } });
      return;
    }
    const id = String(req.params.id);
    const validated = updateCaseSchema.parse(req.body);
    const updated = await updateCase(id, user.userId, validated);
    res.status(200).json(updated);
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
    const user = req.user as JwtPayload | undefined;
    if (!user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No autenticado.' } });
      return;
    }
    const id = String(req.params.id);
    const result = await deleteCase(id, user.userId);
    res.status(200).json(result);
  } catch (err) {
    handleError(err, res);
  }
}