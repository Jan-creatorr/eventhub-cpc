import type { AuthResponse, User } from './types';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';
const SERVER_UNAVAILABLE_MESSAGE =
  'Cannot reach the EventHub server. Please make sure the API is running, then try again.';

let accessToken: string | null = null;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = (await response.json()) as { accessToken: string };
        accessToken = data.accessToken;
        return data.accessToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(SERVER_UNAVAILABLE_MESSAGE, 0);
  }

  const isAuthPath = path.startsWith('/auth/');

  if (response.status === 401 && retry && !isAuthPath) {
    const fresh = await refreshAccessToken();
    if (fresh) {
      return apiRequest<T>(path, options, false);
    }
    accessToken = null;
    window.dispatchEvent(new Event('eventhub:session-expired'));
  }

  let data: unknown = null;
  if (response.status !== 204) {
    const text = await response.text().catch(() => '');
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
  }

  if (!response.ok) {
    const serverMessage =
      data && typeof data === 'object' && 'message' in data
        ? (data as { message?: unknown }).message
        : null;

    let message =
      typeof serverMessage === 'string' && serverMessage.trim()
        ? serverMessage
        : null;

    if (!message && [502, 503, 504].includes(response.status)) {
      message = SERVER_UNAVAILABLE_MESSAGE;
    }

    if (!message) {
      message =
        response.status === 500
          ? 'The server could not complete the request. Please check the API logs and try again.'
          : `Request failed (${response.status}). Please try again.`;
    }

    throw new ApiError(message, response.status);
  }

  return data as T;
}

export async function restoreSession(): Promise<AuthResponse | null> {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { accessToken: string; user: User };
    accessToken = data.accessToken;
    return {
      message: 'Session restored.',
      accessToken: data.accessToken,
      user: data.user,
    };
  } catch {
    return null;
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
