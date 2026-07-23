export function buildConfiguredShortUrl(shortCode: string) {
  const shortUrlBase = String(import.meta.env["VITE_SHORT_URL_BASE"] ?? "");
  const apiBase = String(import.meta.env["VITE_API_URL"] ?? "");
  const baseUrl = shortUrlBase || (apiBase ? new URL(apiBase).origin : window.location.origin);

  return `${baseUrl.replace(/\/+$/, "")}/${encodeURIComponent(shortCode)}`;
}
