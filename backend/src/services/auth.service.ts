import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import type {
  RegisterInput,
  LoginInput,
  JwtPayload,
  AuthResponse,
  TipoUsuario,
  Plan,
} from '../types/auth.types';

// ============================================================================
// CONSTANTES
// ============================================================================
const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || 'certikus_dev_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// ============================================================================
// ERRORES PERSONALIZADOS
// ============================================================================
export class AuthError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'AuthError';
  }
}

// ============================================================================
// HELPERS
// ============================================================================
function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

function toAuthResponse(user: {
  id: string;
  nombre: string;
  email: string;
  tipoUsuario: string;
  plan: string;
  creditosDisponibles: number;
  emailVerified: boolean;
  createdAt: Date;
}): AuthResponse['user'] {
  return {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    tipoUsuario: user.tipoUsuario as TipoUsuario,
    plan: user.plan as Plan,
    creditosDisponibles: user.creditosDisponibles,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}

// ============================================================================
// SERVICIO: REGISTRO
// ============================================================================
export async function registerUser(input: RegisterInput): Promise<AuthResponse> {
  const { nombre, email, password, tipoUsuario } = input;

  // 1. Verificar si el email ya existe
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AuthError(
      'EMAIL_ALREADY_EXISTS',
      'Ya existe una cuenta con este correo electrónico.',
      409
    );
  }

  // 2. Hashear la contraseña
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // 3. Crear el usuario
  const user = await prisma.user.create({
    data: {
      nombre,
      email,
      passwordHash,
      tipoUsuario,
      plan: 'free',
      creditosDisponibles: 1,
      emailVerified: false,
    },
  });

  // 4. Generar token JWT
  const token = generateToken({
    userId: user.id,
    email: user.email,
    tipoUsuario: user.tipoUsuario as TipoUsuario,
  });

  // 5. Retornar respuesta
  return {
    user: toAuthResponse(user),
    token,
  };
}

// ============================================================================
// SERVICIO: LOGIN
// ============================================================================
export async function loginUser(input: LoginInput): Promise<AuthResponse> {
  const { email, password } = input;

  // 1. Buscar el usuario
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Mensaje genérico por seguridad (no revelar si el email existe)
    throw new AuthError(
      'INVALID_CREDENTIALS',
      'Credenciales inválidas. Verifica tu correo y contraseña.',
      401
    );
  }

  // 2. Comparar la contraseña
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AuthError(
      'INVALID_CREDENTIALS',
      'Credenciales inválidas. Verifica tu correo y contraseña.',
      401
    );
  }

  // 3. Generar token JWT
  const token = generateToken({
    userId: user.id,
    email: user.email,
    tipoUsuario: user.tipoUsuario as TipoUsuario,
  });

  // 4. Retornar respuesta
  return {
    user: toAuthResponse(user),
    token,
  };
}

// ============================================================================
// SERVICIO: OBTENER USUARIO POR ID (para /me)
// ============================================================================
export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nombre: true,
      email: true,
      tipoUsuario: true,
      plan: true,
      creditosDisponibles: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AuthError('USER_NOT_FOUND', 'Usuario no encontrado.', 404);
  }

  return toAuthResponse(user);
}

// ============================================================================
// SERVICIO: VERIFICAR TOKEN JWT
// ============================================================================
export function verifyToken(token: string): JwtPayload {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return payload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AuthError('TOKEN_EXPIRED', 'El token ha expirado.', 401);
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new AuthError('INVALID_TOKEN', 'Token inválido.', 401);
    }
    throw new AuthError('AUTH_ERROR', 'Error de autenticación.', 401);
  }
}