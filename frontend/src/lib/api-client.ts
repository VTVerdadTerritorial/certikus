// ============================================================================
// CLIENTE DE API PARA CERTIKUS BACKEND
// ============================================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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

  constructor(message: string, code = 'UNKNOWN', statusCode = 500, field?: string) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.field = field;
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  requiresAuth?: boolean;
  isFormData?: boolean;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, requiresAuth = false, isFormData = false } = options;

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

  const response = await fetch(`${API_URL}${endpoint}`, fetchOptions);

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
      err.message || 'Error en la petición',
      err.code || 'UNKNOWN',
      response.status,
      err.field
    );
  }

  return data as T;
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
  register: (data: {
    nombre: string;
    email: string;
    password: string;
    tipoUsuario: string;
  }) =>
    apiRequest<AuthResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: data,
    }),

  login: (data: { email: string; password: string }) =>
    apiRequest<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: data,
    }),

  me: () =>
    apiRequest<{ user: AuthResponse['user'] }>('/api/v1/auth/me', {
      requiresAuth: true,
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
    }),

  list: () =>
    apiRequest<{ total: number; cases: CaseResponse[] }>('/api/v1/cases', {
      requiresAuth: true,
    }),

  get: (id: string) =>
    apiRequest<CaseResponse>(`/api/v1/cases/${id}`, {
      requiresAuth: true,
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
    });
  },

  list: (caseId: string) =>
    apiRequest<{ total: number; documents: any[] }>(
      `/api/v1/cases/${caseId}/documents`,
      { requiresAuth: true }
    ),

  download: (documentId: string) => {
    const token = getToken();
    return `${API_URL}/api/v1/documents/${documentId}/download?token=${token}`;
  },
};

// ============================================================================
// ENDPOINTS DE ANÁLISIS
// ============================================================================
export const analysisApi = {
  analyze: (caseId: string) =>
    apiRequest<any>(`/api/v1/cases/${caseId}/analyze`, {
      method: 'POST',
      requiresAuth: true,
    }),

  getReport: (caseId: string) =>
    apiRequest<any>(`/api/v1/cases/${caseId}/report`, {
      requiresAuth: true,
    }),

  getReportPdfUrl: (caseId: string) => {
    const token = getToken();
    return `${API_URL}/api/v1/cases/${caseId}/report/pdf?token=${token}`;
  },
};

export { API_URL };