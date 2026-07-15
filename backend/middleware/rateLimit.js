import rateLimit from "express-rate-limit";

import { getEnv } from "../config/env.js";

export function createApiRateLimiter() {
  const { rateLimitWindowMs, rateLimitMax } = getEnv();

  return rateLimit({
    windowMs: rateLimitWindowMs,
    limit: rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        message: "Too many requests. Please try again later.",
      },
    },
  });
}

export function createAuthRateLimiter() {
  const { rateLimitMax } = getEnv();

  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        message: "Too many authentication attempts. Please try again later.",
      },
    },
  });
}
