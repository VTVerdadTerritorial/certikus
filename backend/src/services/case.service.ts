import { prisma } from '../config/database';
import type {
  CreateCaseInput,
  UpdateCaseInput,
  CaseResponse,
  EstadoCaso,
} from '../types/case.types';

// ============================================================================
// ERRORES PERSONALIZADOS
// ============================================================================
export class CaseError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'CaseError';
  }
}

// ============================================================================
// HELPER: Transformar Case de Prisma a CaseResponse
// ============================================================================
function toCaseResponse(
  caseData: {
    id: string;
    userId: string;
    nombre: string;
    tipoOperacion: string | null;
    estado: string;
    consistencia: number | null;
    criticals: number;
    reviews: number;
    oks: number;
    createdAt: Date;
    updatedAt: Date;
    _count?: { documents: number; findings: number };
  }
): CaseResponse {
  return {
    id: caseData.id,
    userId: caseData.userId,
    nombre: caseData.nombre,
    tipoOperacion: caseData.tipoOperacion,
    estado: caseData.estado as EstadoCaso,
    consistencia: caseData.consistencia,
    criticals: caseData.criticals,
    reviews: caseData.reviews,
    oks: caseData.oks,
    createdAt: caseData.createdAt,
    updatedAt: caseData.updatedAt,
    stats: caseData._count
      ? {
          totalDocumentos: caseData._count.documents,
          totalHallazgos: caseData._count.findings,
        }
      : undefined,
  };
}

// ============================================================================
// SERVICIO: CREAR CASO
// ============================================================================
export async function createCase(
  userId: string,
  input: CreateCaseInput
): Promise<CaseResponse> {
  const newCase = await prisma.case.create({
    data: {
      userId,
      nombre: input.nombre,
      tipoOperacion: input.tipoOperacion || null,
      estado: 'draft',
      consistencia: null,
      criticals: 0,
      reviews: 0,
      oks: 0,
    },
    include: {
      _count: {
        select: { documents: true, findings: true },
      },
    },
  });

  return toCaseResponse(newCase);
}

// ============================================================================
// SERVICIO: LISTAR CASOS DEL USUARIO
// ============================================================================
export async function listUserCases(userId: string): Promise<CaseResponse[]> {
  const cases = await prisma.case.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { documents: true, findings: true },
      },
    },
  });

  return cases.map(toCaseResponse);
}

// ============================================================================
// SERVICIO: OBTENER CASO POR ID (con verificación de propiedad)
// ============================================================================
export async function getCaseById(
  caseId: string,
  userId: string
): Promise<CaseResponse> {
  const caseData = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      _count: {
        select: { documents: true, findings: true },
      },
    },
  });

  if (!caseData) {
    throw new CaseError('CASE_NOT_FOUND', 'Expediente no encontrado.', 404);
  }

  // Verificar que el caso pertenece al usuario autenticado
  if (caseData.userId !== userId) {
    throw new CaseError(
      'FORBIDDEN',
      'No tienes permiso para acceder a este expediente.',
      403
    );
  }

  return toCaseResponse(caseData);
}

// ============================================================================
// SERVICIO: ACTUALIZAR CASO
// ============================================================================
export async function updateCase(
  caseId: string,
  userId: string,
  input: UpdateCaseInput
): Promise<CaseResponse> {
  // Verificar propiedad primero
  await getCaseById(caseId, userId);

  const updated = await prisma.case.update({
    where: { id: caseId },
    data: {
      ...(input.nombre !== undefined && { nombre: input.nombre }),
      ...(input.tipoOperacion !== undefined && {
        tipoOperacion: input.tipoOperacion,
      }),
    },
    include: {
      _count: {
        select: { documents: true, findings: true },
      },
    },
  });

  return toCaseResponse(updated);
}

// ============================================================================
// SERVICIO: ELIMINAR CASO
// ============================================================================
export async function deleteCase(
  caseId: string,
  userId: string
): Promise<{ message: string }> {
  // Verificar propiedad primero
  await getCaseById(caseId, userId);

  await prisma.case.delete({
    where: { id: caseId },
  });

  return { message: 'Expediente eliminado correctamente.' };
}