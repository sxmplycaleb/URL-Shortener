import { resolveRedirect } from "../services/redirectService.js";

export async function redirect(request, response) {
  const originalUrl = await resolveRedirect(request.params.shortCode, request);
  response.redirect(302, originalUrl);
}
