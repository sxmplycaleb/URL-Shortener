import { createApiKey, getApiUsageSummary, listApiKeys, revokeApiKey } from "../services/apiKeyService.js";

export async function create(request, response) {
  response.status(201).json(await createApiKey(request.user._id, request.validatedBody));
}

export async function list(request, response) {
  response.json({ apiKeys: await listApiKeys(request.user._id) });
}

export async function revoke(request, response) {
  response.json({ apiKey: await revokeApiKey(request.user._id, request.params.id) });
}

export async function usage(request, response) {
  response.json({ usage: await getApiUsageSummary(request.user._id) });
}

export async function docs(_request, response) {
  response.json({
    title: "Shortly Public API",
    status: "placeholder",
    authentication: "Send an API key in the X-API-Key header.",
    endpoints: [
      "GET /api/public/v1/urls",
      "POST /api/public/v1/urls",
      "GET /api/public/v1/analytics",
    ],
  });
}
