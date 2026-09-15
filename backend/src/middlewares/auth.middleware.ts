import { Request, Response, NextFunction } from 'express';
import { verifyToken, AuthError } from '../services/auth.service';
import type { JwtPayload } from '../types/auth.types';

// Extendemos el tipo Request para incluir 'user'
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// ============================================================================
// MIDDLEWARE: requireAuth
// Verifica que el request tenga un JWT válido en el header Authorization.
// Si es válido, agrega req.user con el payload del token.
// Si no, responde con 401.
// ============================================================================
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        error: {
          code: 'NO_TOKEN',
          message: 'Token de autenticación requerido.',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Formato esperado: "Bearer <token>"
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Formato de token inválido. Use: Bearer <token>',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const token = parts[1];
    const payload = verifyToken(token);

    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({
        error: {
          code: err.code,
          message: err.message,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    res.status(401).json({
      error: {
        code: 'AUTH_ERROR',
        message: 'Error de autenticación.',
        timestamp: new Date().toISOString(),
      },
    });
  }
}