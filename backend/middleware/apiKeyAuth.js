import { performance } from "node:perf_hooks";

import { findUserForApiKey, recordApiUsage } from "../services/apiKeyService.js";
import AppError from "../utils/AppError.js";

export async function requireApiKey(request, response, next) {
  const startedAt = performance.now();
  const apiKey = request.get("x-api-key") ?? request.get("authorization")?.replace(/^Bearer\s+/i, "");

  try {
    const result = await findUserForApiKey(apiKey);
    request.user = result.user;
    request.apiKey = result.apiKey;

    response.on("finish", () => {
      void recordApiUsage({
        userId: result.user._id,
        apiKeyId: result.apiKey._id,
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
      });
    });

    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError("API key authentication failed.", 401));
  }
}
