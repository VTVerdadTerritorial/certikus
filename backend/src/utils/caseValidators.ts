import { z } from 'zod';

// ============================================================================
// ESQUEMAS DE VALIDACIÓN PARA CASOS
// ============================================================================

const tipoOperacionEnum = z.enum([
  'compraventa',
  'hipoteca',
  'sucesion',
  'donacion',
  'permuta',
  'propiedad_horizontal',
  'otro',
]);

export const createCaseSchema = z.object({
  nombre: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(200, 'El nombre es demasiado largo')
    .trim(),
  tipoOperacion: tipoOperacionEnum.optional(),
});

export const updateCaseSchema = z.object({
  nombre: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(200, 'El nombre es demasiado largo')
    .trim()
    .optional(),
  tipoOperacion: tipoOperacionEnum.optional(),
});

export const caseIdSchema = z.object({
  id: z.string().uuid('ID de caso inválido'),
});

export type CreateCaseSchema = z.infer<typeof createCaseSchema>;
export type UpdateCaseSchema = z.infer<typeof updateCaseSchema>;