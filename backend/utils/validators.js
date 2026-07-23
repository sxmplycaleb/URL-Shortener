const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SHORT_CODE_REGEX = /^[A-Za-z0-9_-]+$/;
const CUSTOM_ALIAS_REGEX = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const URL_PROTOCOLS = new Set(["http:", "https:"]);
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "10minutemail.com",
  "guerrillamail.com",
  "mailinator.com",
  "tempmail.com",
  "throwawaymail.com",
  "yopmail.com",
]);

export const USER_ROLES = Object.freeze(["user", "admin"]);
export const MIN_NAME_LENGTH = 2;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const MAX_NAME_LENGTH = 80;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_URL_LENGTH = 2048;
export const MIN_SHORT_CODE_LENGTH = 4;
export const MAX_SHORT_CODE_LENGTH = 32;
export const MAX_ALIAS_LENGTH = 64;
export const MAX_TOKEN_LENGTH = 512;

export function isValidEmail(value) {
  if (typeof value !== "string") {
    return false;
  }

  const email = value.trim().toLowerCase();
  const [, domain = ""] = email.split("@");

  return (
    EMAIL_REGEX.test(email) &&
    email.length <= MAX_EMAIL_LENGTH &&
    !email.includes("..") &&
    !domain.startsWith("-") &&
    !domain.endsWith("-") &&
    !DISPOSABLE_EMAIL_DOMAINS.has(domain)
  );
}

export function isStrongEnoughPassword(value) {
  return (
    typeof value === "string" &&
    value.length >= MIN_PASSWORD_LENGTH &&
    value.length <= MAX_PASSWORD_LENGTH &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

export function isHttpUrl(value) {
  if (typeof value !== "string" || value.length > MAX_URL_LENGTH) {
    return false;
  }

  try {
    const url = new URL(value);
    return URL_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

export function isShortCode(value) {
  return typeof value === "string" && SHORT_CODE_REGEX.test(value);
}

export function isCustomAlias(value) {
  return typeof value === "string" && CUSTOM_ALIAS_REGEX.test(value);
}
