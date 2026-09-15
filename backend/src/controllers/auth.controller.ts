import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { registerSchema, loginSchema } from '../utils/validators';
import {
  registerUser,
  loginUser,
  getUserById,
  AuthError,
} from '../services/auth.service';
import type { JwtPayload } from '../types/auth.types';

// ============================================================================
// HELPER: Manejo centralizado de errores
// ============================================================================
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

  if (err instanceof AuthError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        timestamp: new Date().toISOString(),
      },
    });
  }

  console.error('Error inesperado en auth:', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error inesperado.',
      timestamp: new Date().toISOString(),
    },
  });
}

// ============================================================================
// POST /api/v1/auth/register
// ============================================================================
export async function register(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  try {
    const validated = registerSchema.parse(req.body);
    const result = await registerUser(validated);

    res.status(201).json(result);
  } catch (err) {
    handleError(err, res);
  }
}

// ============================================================================
// POST /api/v1/auth/login
// ============================================================================
export async function login(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  try {
    const validated = loginSchema.parse(req.body);
    const result = await loginUser(validated);

    res.status(200).json(result);
  } catch (err) {
    handleError(err, res);
  }
}

// ============================================================================
// GET /api/v1/auth/me
// ============================================================================
export async function me(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  try {
    const user = req.user as JwtPayload | undefined;

    if (!user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'No autenticado.',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const userData = await getUserById(user.userId);
    res.status(200).json({ user: userData });
  } catch (err) {
    handleError(err, res);
  }
}

// ============================================================================
// POST /api/v1/auth/logout
// ============================================================================
export async function logout(
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  // JWT es stateless, así que el cliente debe eliminar el token.
  // En el futuro se puede implementar una lista negra de tokens.
  res.status(200).json({
    message: 'Sesión cerrada correctamente.',
  });
}