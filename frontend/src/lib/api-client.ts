// ============================================================================
// CLIENTE DE API PARA CERTIKUS BACKEND (v2 — con timeout y retry)
// ============================================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Timeouts por tipo de operacion (en milisegundos)
const TIMEOUT_UPLOAD_MS = 5 * 60 * 1000;   // 5 minutos para subir PDFs
const TIMEOUT_ANALYZE_MS = 5 * 60 * 1000;  // 5 minutos para analizar (OCR lento)
const TIMEOUT_DEFAULT_MS = 30 * 1000;      // 30s para peticiones rapidas

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================
const TOKEN_KEY = 'certikus_jwt_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
}

// ============================================================================
// CLIENTE BASE
// ============================================================================
export class ApiError extends Error {
  code: string;
  statusCode: number;
  field?: string;
  isNetworkError: boolean;

  constructor(
    message: string,
    code = 'UNKNOWN',
    statusCode = 500,
    field?: string,
    isNetworkError = false
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.field = field;
    this.isNetworkError = isNetworkError;
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  requiresAuth?: boolean;
  isFormData?: boolean;
  timeoutMs?: number;
  retries?: number;
}

// fetch con timeout usando AbortController
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(
        `La peticion tardo mas de ${Math.round(timeoutMs / 1000)} segundos. El servidor puede estar procesando el documento. Intenta de nuevo.`,
        'TIMEOUT',
        408,
        undefined,
        true
      );
    }
    if (err instanceof TypeError) {
      // "Failed to fetch" del navegador
      throw new ApiError(
        'No se pudo conectar con el servidor. Verifica tu conexion a internet e intenta de nuevo.',
        'NETWORK_ERROR',
        0,
        undefined,
        true
      );
    }
    throw err;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    requiresAuth = false,
    isFormData = false,
    timeoutMs = TIMEOUT_DEFAULT_MS,
    retries = 0,
  } = options;

  const headers: Record<string, string> = {};

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (requiresAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (body) {
    fetchOptions.body = isFormData ? (body as FormData) : JSON.stringify(body);
  }

  // Sistema de reintentos con backoff exponencial
  let lastError: unknown;
  const intentosTotales = retries + 1;

  for (let intento = 0; intento < intentosTotales; intento++) {
    try {
      const response = await fetchWithTimeout(
        `${API_URL}${endpoint}`,
        fetchOptions,
        timeoutMs
      );

      // Sin contenido
      if (response.status === 204) {
        return {} as T;
      }

      let data: any;
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        const err = data.error || {};
        throw new ApiError(
          err.message || 'Error en la peticion',
          err.code || 'UNKNOWN',
          response.status,
          err.field
        );
      }

      return data as T;
    } catch (err) {
      lastError = err;

      // Solo reintentar errores de red o timeout (no errores 4xx del backend)
      const esErrorRecuperable =
        err instanceof ApiError &&
        (err.isNetworkError || err.code === 'TIMEOUT') &&
        intento < intentosTotales - 1;

      if (esErrorRecuperable) {
        const esperaMs = Math.pow(2, intento) * 1000; // 1s, 2s, 4s
        console.log(
          `[CERTIKUS] Reintento ${intento + 1}/${retries} en ${esperaMs}ms...`
        );
        await new Promise((r) => setTimeout(r, esperaMs));
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}

// ============================================================================
// TIPOS DE RESPUESTA
// ============================================================================
export interface AuthResponse {
  user: {
    id: string;
    nombre: string;
    email: string;
    tipoUsuario: 'abogado' | 'notaria' | 'inmobiliaria' | 'ciudadano';
    plan: string;
    creditosDisponibles: number;
    emailVerified: boolean;
    createdAt: string;
  };
  token: string;
}

export interface CaseResponse {
  id: string;
  userId: string;
  nombre: string;
  tipoOperacion: string | null;
  estado: string;
  consistencia: number | null;
  criticals: number;
  reviews: number;
  oks: number;
  createdAt: string;
  updatedAt: string;
  stats?: {
    totalDocumentos: number;
    totalHallazgos: number;
  };
}

// ============================================================================
// ENDPOINTS DE AUTH
// ============================================================================
export const authApi = {
  register: (data: { nombre: string; email: string; password: string; tipoUsuario: string }) =>
    apiRequest<AuthResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: data,
      retries: 2,
    }),

  login: (data: { email: string; password: string }) =>
    apiRequest<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: data,
      retries: 2,
    }),

  me: () =>
    apiRequest<{ user: AuthResponse['user'] }>('/api/v1/auth/me', {
      requiresAuth: true,
      retries: 1,
    }),

  logout: () =>
    apiRequest<{ message: string }>('/api/v1/auth/logout', {
      method: 'POST',
      requiresAuth: true,
    }),
};

// ============================================================================
// ENDPOINTS DE CASOS
// ============================================================================
export const casesApi = {
  create: (data: { nombre: string; tipoOperacion?: string }) =>
    apiRequest<CaseResponse>('/api/v1/cases', {
      method: 'POST',
      body: data,
      requiresAuth: true,
      retries: 2,
    }),

  list: () =>
    apiRequest<{ total: number; cases: CaseResponse[] }>('/api/v1/cases', {
      requiresAuth: true,
      retries: 2,
    }),

  get: (id: string) =>
    apiRequest<CaseResponse>(`/api/v1/cases/${id}`, {
      requiresAuth: true,
      retries: 2,
    }),

  update: (id: string, data: { nombre?: string; tipoOperacion?: string }) =>
    apiRequest<CaseResponse>(`/api/v1/cases/${id}`, {
      method: 'PATCH',
      body: data,
      requiresAuth: true,
    }),

  remove: (id: string) =>
    apiRequest<{ message: string }>(`/api/v1/cases/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    }),
};

// ============================================================================
// ENDPOINTS DE DOCUMENTOS
// ============================================================================
export const documentsApi = {
  upload: (caseId: string, file: File, tipo: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo', tipo);

    return apiRequest<any>(`/api/v1/cases/${caseId}/documents`, {
      method: 'POST',
      body: formData,
      requiresAuth: true,
      isFormData: true,
      timeoutMs: TIMEOUT_UPLOAD_MS,
      retries: 2, // 3 intentos totales con backoff
    });
  },

  list: (caseId: string) =>
    apiRequest<{ total: number; documents: any[] }>(
      `/api/v1/cases/${caseId}/documents`,
      { requiresAuth: true, retries: 2 }
    ),
delete: (documentId: string) =>
    apiRequest<{ message: string }>(`/api/v1/documents/${documentId}`, {
      method: 'DELETE',
      requiresAuth: true,
    }),
  download: (documentId: string) => {
    const token = getToken();
    return `${API_URL}/api/v1/documents/${documentId}/download?token=${token}`;
  },
};

// ============================================================================
// ENDPOINTS DE ANALISIS
// ============================================================================
export const analysisApi = {
  analyze: (caseId: string) =>
    apiRequest<any>(`/api/v1/cases/${caseId}/analyze`, {
      method: 'POST',
      requiresAuth: true,
      timeoutMs: TIMEOUT_ANALYZE_MS, // 5 minutos para OCR
      retries: 1, // 2 intentos (el OCR puede tardar)
    }),

  getReport: (caseId: string) =>
    apiRequest<any>(`/api/v1/cases/${caseId}/report`, {
      requiresAuth: true,
      retries: 2,
    }),

  getReportPdfUrl: (caseId: string) => {
    const token = getToken();
    return `${API_URL}/api/v1/cases/${caseId}/report/pdf?token=${token}`;
  },
};

export { API_URL };
