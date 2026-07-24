import { authenticatedApiRequest } from "@/services/api";

export interface ShortenedUrl {
  id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  customAlias?: string;
  title?: string;
  clickCount: number;
  expiresAt?: string;
  isActive: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  hasQrCode: boolean;
  shareCount: number;
  lastClickedAt?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateShortenedUrlRequest {
  originalUrl: string;
  customAlias?: string;
  title?: string;
}

export interface UpdateShortenedUrlRequest {
  originalUrl?: string;
  customAlias?: string;
  title?: string;
  expiresAt?: string;
  isActive?: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
  hasQrCode?: boolean;
  shareCount?: number;
  tags?: string[];
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

export function updateShortenedUrl(accessToken: string, id: string, body: UpdateShortenedUrlRequest) {
  return authenticatedApiRequest<UrlResponse>(`/api/urls/${encodeURIComponent(id)}`, {
    method: "PUT",
    accessToken,
    body,
  });
}
