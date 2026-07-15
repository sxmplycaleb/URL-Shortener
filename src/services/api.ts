import { clearAuthSession, getAuthSession, saveAuthSession, type StoredAuthSession } from "@/services/authStorage";

const API_BASE_URL = import.meta.env["VITE_API_URL"] ?? "";

export interface ApiErrorBody {
  error?: {
    message?: string;
    details?: string[];
  };
}

export class ApiError extends Error {
  status: number;
  details: string[];

  constructor(message: string, status: number, details: string[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function parseResponse<TResponse>(response: Response): Promise<TResponse> {
  const data = (await response.json().catch(() => null)) as ApiErrorBody | TResponse | null;

  if (!response.ok) {
    const errorBody = data as ApiErrorBody | null;
    const message = errorBody?.error?.message ?? "Something went wrong. Please try again.";
    const details = errorBody?.error?.details ?? [];

    throw new ApiError(message, response.status, details);
  }

  return data as TResponse;
}

export async function apiRequest<TResponse, TBody extends object>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  return parseResponse<TResponse>(response);
}

interface AuthenticatedRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: object | undefined;
  accessToken: string;
}

async function refreshSession(): Promise<StoredAuthSession | null> {
  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    clearAuthSession();
    return null;
  }

  const session = await parseResponse<StoredAuthSession>(response);
  saveAuthSession(session);
  return session;
}

async function sendAuthenticatedRequest(
  path: string,
  { method = "GET", body, accessToken }: AuthenticatedRequestOptions,
) {
  const init: RequestInit = {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: "include",
  };

  if (body) {
    init.body = JSON.stringify(body);
  }

  return fetch(`${API_BASE_URL}${path}`, init);
}

export async function authenticatedApiRequest<TResponse>(
  path: string,
  { method = "GET", body, accessToken }: AuthenticatedRequestOptions,
): Promise<TResponse> {
  let response = await sendAuthenticatedRequest(path, { method, body, accessToken });

  if (response.status === 401) {
    const refreshedSession = await refreshSession();
    const nextAccessToken = refreshedSession?.accessToken ?? getAuthSession()?.accessToken;

    if (nextAccessToken) {
      response = await sendAuthenticatedRequest(path, { method, body, accessToken: nextAccessToken });
    }
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return parseResponse<TResponse>(response);
}
