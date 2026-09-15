// ============================================================================
// TIPOS DE AUTENTICACIÓN
// ============================================================================

export type TipoUsuario = 'abogado' | 'notaria' | 'inmobiliaria' | 'ciudadano';

export type Plan = 'free' | 'pro' | 'notarial' | 'business' | 'enterprise';

export interface RegisterInput {
  nombre: string;
  email: string;
  password: string;
  tipoUsuario: TipoUsuario;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  tipoUsuario: TipoUsuario;
}

export interface AuthResponse {
  user: {
    id: string;
    nombre: string;
    email: string;
    tipoUsuario: TipoUsuario;
    plan: Plan;
    creditosDisponibles: number;
    emailVerified: boolean;
    createdAt: Date;
  };
  token: string;
}