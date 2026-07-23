import { authenticatedApiRequest } from "@/services/api";

export interface ShortenedUrl {
  id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  customAlias?: string;
  clickCount: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShortenedUrlRequest {
  originalUrl: string;
  customAlias?: string;
}

interface UrlListResponse {
  urls: ShortenedUrl[];
}

interface UrlResponse {
  url: ShortenedUrl;
}

export function listShortenedUrls(accessToken: string) {
  return authenticatedApiRequest<UrlListResponse>("/api/urls", { accessToken });
}

export function createShortenedUrl(accessToken: string, body: CreateShortenedUrlRequest) {
  return authenticatedApiRequest<UrlResponse>("/api/urls", {
    method: "POST",
    accessToken,
    body,
  });
}

export function deleteShortenedUrl(accessToken: string, id: string) {
  return authenticatedApiRequest<void>(`/api/urls/${encodeURIComponent(id)}`, {
    method: "DELETE",
    accessToken,
  });
}
