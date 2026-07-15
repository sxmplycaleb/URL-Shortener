import dotenv from "dotenv";

dotenv.config();

const MIN_JWT_SECRET_LENGTH = 32;
const MIN_HASH_SALT_LENGTH = 16;
const DEFAULT_CLIENT_URL = "http://localhost:5173";

function required(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}.`);
  }

  return value;
}

function numberValue(name, fallback) {
  const value = process.env[name];

  if (value == null || value === "") {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a valid number.`);
  }

  return parsed;
}

function requiredSecret(name, minimumLength) {
  const value = required(name);

  if (value.length < minimumLength) {
    throw new Error(`${name} must be at least ${minimumLength} characters long.`);
  }

  return value;
}

function urlListValue(name, fallback) {
  const rawValue = process.env[name] ?? fallback;
  const values = rawValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (values.length === 0) {
    throw new Error(`${name} must include at least one URL.`);
  }

  for (const value of values) {
    try {
      const url = new URL(value);

      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error();
      }
    } catch {
      throw new Error(`${name} must contain valid http or https URLs.`);
    }
  }

  return values;
}

export function getEnv() {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const clientUrls = urlListValue("CLIENT_URL", nodeEnv === "production" ? "" : DEFAULT_CLIENT_URL);

  return {
    nodeEnv,
    port: numberValue("PORT", 3000),
    clientUrl: clientUrls[0],
    clientUrls,
    accessTokenSecret: requiredSecret("JWT_SECRET", MIN_JWT_SECRET_LENGTH),
    refreshTokenSecret: requiredSecret("JWT_REFRESH_SECRET", MIN_JWT_SECRET_LENGTH),
    hashSalt: requiredSecret("HASH_SALT", MIN_HASH_SALT_LENGTH),
    accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
    refreshTokenTtlDays: numberValue("JWT_REFRESH_TTL_DAYS", 7),
    rateLimitWindowMs: numberValue("RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
    rateLimitMax: numberValue("RATE_LIMIT_MAX", 100),
  };
}
