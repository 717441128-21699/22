import { useAuthStore } from '../store/authStore';

interface ApiOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
}

interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
  success: boolean;
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const DEFAULT_TIMEOUT = 15000;

class ApiError extends Error {
  public code: number;
  public data?: unknown;

  constructor(message: string, code: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.data = data;
  }
}

function buildUrl(url: string, params?: ApiOptions['params']): string {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;

  if (!params) return fullUrl;

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `${fullUrl}?${queryString}` : fullUrl;
}

function getHeaders(initHeaders?: HeadersInit): Headers {
  const headers = new Headers(initHeaders);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const rawToken = useAuthStore.getState().token;
  const token = rawToken ? rawToken.replace(/^Bearer\s+/i, '') : '';
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

async function request<T = unknown>(
  url: string,
  options: ApiOptions = {}
): Promise<T> {
  const { params, timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options;

  const fullUrl = buildUrl(url, params);
  const headers = getHeaders(fetchOptions.headers);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(fullUrl, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
      credentials: 'include',
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    let data: ApiResponse<T> | T;
    if (isJson) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text) as ApiResponse<T> | T;
      } catch {
        data = text as unknown as T;
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new ApiError('登录已过期，请重新登录', 401);
      }

      const message =
        (data as ApiResponse)?.message ||
        `请求失败 (${response.status})`;
      throw new ApiError(message, response.status, (data as ApiResponse)?.data);
    }

    if (isJson && typeof data === 'object' && data !== null && (('code' in data) || ('success' in data))) {
      const apiData = data as ApiResponse<T>;
      if (apiData.success === false) {
        throw new ApiError(apiData.message || '请求失败', apiData.code || 500, apiData.data);
      }
      return apiData.data;
    }

    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ApiError('请求超时，请稍后重试', 408);
      }
      throw new ApiError(error.message, 500);
    }

    throw new ApiError('网络错误，请稍后重试', 500);
  }
}

export const api = {
  get: <T = unknown>(url: string, options?: ApiOptions) =>
    request<T>(url, { ...options, method: 'GET' }),

  post: <T = unknown>(url: string, body?: unknown, options?: ApiOptions) =>
    request<T>(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = unknown>(url: string, body?: unknown, options?: ApiOptions) =>
    request<T>(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = unknown>(url: string, body?: unknown, options?: ApiOptions) =>
    request<T>(url, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = unknown>(url: string, options?: ApiOptions) =>
    request<T>(url, { ...options, method: 'DELETE' }),

  upload: <T = unknown>(url: string, formData: FormData, options?: ApiOptions) =>
    request<T>(url, {
      ...options,
      method: 'POST',
      body: formData,
      headers: {},
    }),
};

export { ApiError };
export type { ApiOptions, ApiResponse };
