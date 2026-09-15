import { z } from 'zod';

// ============================================================================
// ESQUEMAS DE VALIDACIÓN CON ZOD
// ============================================================================

export const registerSchema = z.object({
  nombre: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(200, 'El nombre es demasiado largo')
    .trim(),
  email: z
    .string()
    .email('El correo electrónico no es válido')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(100, 'La contraseña es demasiado larga')
    .regex(/[A-Za-z]/, 'Debe contener al menos una letra')
    .regex(/\d/, 'Debe contener al menos un número'),
  tipoUsuario: z.enum(['abogado', 'notaria', 'inmobiliaria', 'ciudadano'], {
    message: 'Tipo de usuario inválido',
  }),
});

export const loginSchema = z.object({
  email: z.string().email('El correo electrónico no es válido').toLowerCase().trim(),
  password: z.string().min(1, 'La contraseña es requerida'),
});

// Tipos inferidos de los schemas
export type RegisterSchema = z.infer<typeof registerSchema>;
export type LoginSchema = z.infer<typeof loginSchema>;