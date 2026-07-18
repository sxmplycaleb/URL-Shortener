import crypto from "node:crypto";

import { logger } from "../utils/logger.js";

const HEALTH_PATHS = new Set(["/health", "/api/health", "/ready", "/api/ready"]);
const STATIC_ASSET_PATTERN = /\.(?:css|js|map|png|jpg|jpeg|gif|svg|ico|webp|woff2?)$/i;

function shouldSkipRequest(request) {
  return HEALTH_PATHS.has(request.path) || STATIC_ASSET_PATTERN.test(request.path);
}

function routeFamily(path) {
  if (path.startsWith("/api/auth")) return "auth";
  if (path.startsWith("/api/account")) return "account";
  if (path.startsWith("/api/urls")) return "urls";
  if (path.startsWith("/api/analytics")) return "analytics";
  if (path.startsWith("/api/")) return "api";
  return "redirect_or_page";
}

export function requestLogger(request, response, next) {
  if (shouldSkipRequest(request)) {
    next();
    return;
  }

  const startedAt = process.hrtime.bigint();
  const requestId = request.get("x-request-id") || crypto.randomUUID();

  response.set("X-Request-Id", requestId);

  response.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const level = response.statusCode >= 500 ? "error" : response.statusCode >= 400 ? "warn" : "info";

    logger[level]("http.request", {
      requestId,
      method: request.method,
      path: request.path,
      routeFamily: routeFamily(request.path),
      statusCode: response.statusCode,
      durationMs: Math.round(durationMs),
      userId: request.user?._id?.toString(),
    });
  });

  next();
}
