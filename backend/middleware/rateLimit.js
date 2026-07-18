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
  const { authRateLimitWindowMs, authRateLimitMax } = getEnv();

  return rateLimit({
    windowMs: authRateLimitWindowMs,
    limit: authRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        message: "Too many authentication attempts. Please try again later.",
      },
    },
  });
}

export function createUrlCreationRateLimiter() {
  const { urlCreationRateLimitWindowMs, urlCreationRateLimitMax } = getEnv();

  return rateLimit({
    windowMs: urlCreationRateLimitWindowMs,
    limit: urlCreationRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        message: "Too many URL creation attempts. Please try again later.",
      },
    },
  });
}

export function createRedirectRateLimiter() {
  const { redirectRateLimitWindowMs, redirectRateLimitMax } = getEnv();

  return rateLimit({
    windowMs: redirectRateLimitWindowMs,
    limit: redirectRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        message: "Too many redirect requests. Please try again later.",
      },
    },
  });
}

export function createPasswordRateLimiter() {
  const { passwordRateLimitWindowMs, passwordRateLimitMax } = getEnv();

  return rateLimit({
    windowMs: passwordRateLimitWindowMs,
    limit: passwordRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        message: "Too many password change attempts. Please try again later.",
      },
    },
  });
}
