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

  const data = (await response.json().catch(() => null)) as ApiErrorBody | TResponse | null;

  if (!response.ok) {
    const errorBody = data as ApiErrorBody | null;
    const message = errorBody?.error?.message ?? "Something went wrong. Please try again.";
    const details = errorBody?.error?.details ?? [];

    throw new ApiError(message, response.status, details);
  }

  return data as TResponse;
}
