import dotenv from "dotenv";

dotenv.config();

const MIN_JWT_SECRET_LENGTH = 32;
const MIN_HASH_SALT_LENGTH = 16;
const DEFAULT_CLIENT_URL = "http://localhost:5173";
const VALID_NODE_ENVS = new Set(["development", "production", "test"]);
const VALID_COOKIE_SAME_SITE_VALUES = new Set(["strict", "lax", "none"]);
const FIREBASE_PRIVATE_KEY_PLACEHOLDER = "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n";

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

function integerValue(name, fallback, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = numberValue(name, fallback);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }

  return parsed;
}

function trustProxyValue(nodeEnv) {
  const rawValue = process.env.TRUST_PROXY;

  if (rawValue == null || rawValue === "") {
    return nodeEnv === "production" ? 1 : "loopback";
  }

  const normalizedValue = rawValue.trim().toLowerCase();

  if (normalizedValue === "true") {
    return true;
  }

  if (normalizedValue === "false") {
    return false;
  }

  if (/^\d+$/.test(normalizedValue)) {
    return Number(normalizedValue);
  }

  return rawValue;
}

function booleanValue(name, fallback) {
  const rawValue = process.env[name];

  if (rawValue == null || rawValue === "") {
    return fallback;
  }

  const normalizedValue = rawValue.trim().toLowerCase();

  if (normalizedValue === "true") {
    return true;
  }

  if (normalizedValue === "false") {
    return false;
  }

  throw new Error(`${name} must be either true or false.`);
}

function cookieSameSiteValue(nodeEnv) {
  const rawValue = process.env.AUTH_COOKIE_SAME_SITE;

  if (rawValue == null || rawValue === "") {
    return nodeEnv === "production" ? "none" : "strict";
  }

  const normalizedValue = rawValue.trim().toLowerCase();

  if (!VALID_COOKIE_SAME_SITE_VALUES.has(normalizedValue)) {
    throw new Error(
      `AUTH_COOKIE_SAME_SITE must be one of: ${Array.from(VALID_COOKIE_SAME_SITE_VALUES).join(", ")}.`,
    );
  }

  return normalizedValue;
}

function requiredSecret(name, minimumLength) {
  const value = required(name);

  if (value.length < minimumLength) {
    throw new Error(`${name} must be at least ${minimumLength} characters long.`);
  }

  return value;
}

function requiredFirebaseValue(name) {
  const value = required(name).trim();

  if (value === "" || value === FIREBASE_PRIVATE_KEY_PLACEHOLDER) {
    throw new Error(`${name} must be configured for Google authentication.`);
  }

  return value;
}

function firebasePrivateKeyValue() {
  return requiredFirebaseValue("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");
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

function absoluteUrlValue(name, fallback, nodeEnv, { requireHttpsInProduction = false } = {}) {
  const value = (process.env[name] ?? fallback).trim();

  if (!value) {
    throw new Error(`${name} must be configured.`);
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid http or https URL.`);
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error(`${name} must be a valid http or https URL.`);
  }

  if (requireHttpsInProduction && nodeEnv === "production" && parsedUrl.protocol !== "https:") {
    throw new Error(`${name} must use https in production.`);
  }

  parsedUrl.pathname = parsedUrl.pathname.replace(/\/+$/, "");
  parsedUrl.search = "";
  parsedUrl.hash = "";

  return parsedUrl.toString().replace(/\/$/, "");
}

export function getEnv() {
  const nodeEnv = process.env.NODE_ENV ?? "development";

  if (!VALID_NODE_ENVS.has(nodeEnv)) {
    throw new Error(`NODE_ENV must be one of: ${Array.from(VALID_NODE_ENVS).join(", ")}.`);
  }

  const clientUrls = urlListValue("CLIENT_URL", nodeEnv === "production" ? "" : DEFAULT_CLIENT_URL);
  const rateLimitWindowMs = numberValue("RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000);
  const rateLimitMax = numberValue("RATE_LIMIT_MAX", 100);
  const authCookieSameSite = cookieSameSiteValue(nodeEnv);
  const authCookieSecure = booleanValue("AUTH_COOKIE_SECURE", nodeEnv === "production");

  if (authCookieSameSite === "none" && !authCookieSecure) {
    throw new Error("AUTH_COOKIE_SECURE must be true when AUTH_COOKIE_SAME_SITE is none.");
  }

  const shortUrlBase = absoluteUrlValue("SHORT_URL_BASE", clientUrls[0], nodeEnv, {
    requireHttpsInProduction: true,
  });

  return {
    nodeEnv,
    port: integerValue("PORT", 3000, { min: 1, max: 65_535 }),
    trustProxy: trustProxyValue(nodeEnv),
    staticDir: process.env.STATIC_DIR ?? "dist",
    shortUrlBase,
    clientUrl: clientUrls[0],
    clientUrls,
    accessTokenSecret: requiredSecret("JWT_SECRET", MIN_JWT_SECRET_LENGTH),
    refreshTokenSecret: requiredSecret("JWT_REFRESH_SECRET", MIN_JWT_SECRET_LENGTH),
    hashSalt: requiredSecret("HASH_SALT", MIN_HASH_SALT_LENGTH),
    accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
    refreshTokenTtlDays: numberValue("JWT_REFRESH_TTL_DAYS", 7),
    authCookieSameSite,
    authCookieSecure,
    rateLimitWindowMs,
    rateLimitMax,
    authRateLimitWindowMs: numberValue("AUTH_RATE_LIMIT_WINDOW_MS", rateLimitWindowMs),
    authRateLimitMax: numberValue("AUTH_RATE_LIMIT_MAX", rateLimitMax),
    urlCreationRateLimitWindowMs: numberValue("URL_CREATION_RATE_LIMIT_WINDOW_MS", rateLimitWindowMs),
    urlCreationRateLimitMax: numberValue("URL_CREATION_RATE_LIMIT_MAX", rateLimitMax),
    redirectRateLimitWindowMs: numberValue("REDIRECT_RATE_LIMIT_WINDOW_MS", rateLimitWindowMs),
    redirectRateLimitMax: numberValue("REDIRECT_RATE_LIMIT_MAX", rateLimitMax),
    passwordRateLimitWindowMs: numberValue("PASSWORD_RATE_LIMIT_WINDOW_MS", rateLimitWindowMs),
    passwordRateLimitMax: numberValue("PASSWORD_RATE_LIMIT_MAX", rateLimitMax),
    firebaseProjectId: requiredFirebaseValue("FIREBASE_PROJECT_ID"),
    firebaseClientEmail: requiredFirebaseValue("FIREBASE_CLIENT_EMAIL"),
    firebasePrivateKey: firebasePrivateKeyValue(),
  };
}
