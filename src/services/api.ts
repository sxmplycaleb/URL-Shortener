import { getAuthSession, saveAuthSession, type StoredAuthSession } from "@/services/authStorage";

const API_BASE_URL = import.meta.env["VITE_API_URL"] ?? "";
const API_TIMEOUT_MS = 10_000;

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
  if (response.status === 204) {
    return undefined as TResponse;
  }

  const data = (await response.json().catch(() => null)) as ApiErrorBody | TResponse | null;

  if (!response.ok) {
    const errorBody = data as ApiErrorBody | null;
    const message = errorBody?.error?.message ?? "Something went wrong. Please try again.";
    const details = errorBody?.error?.details ?? [];

    throw new ApiError(message, response.status, details);
  }

  if (data === null) {
    throw new ApiError("Invalid response from server.", response.status);
  }

  return data as TResponse;
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: init?.signal ?? controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("The request timed out. Please try again.", 0);
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function apiRequest<TResponse, TBody extends object>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
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
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
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

  return fetchWithTimeout(`${API_BASE_URL}${path}`, init);
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

  return parseResponse<TResponse>(response);
}
