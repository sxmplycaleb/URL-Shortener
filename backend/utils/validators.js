const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SHORT_CODE_REGEX = /^[A-Za-z0-9_-]+$/;
const CUSTOM_ALIAS_REGEX = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const URL_PROTOCOLS = new Set(["http:", "https:"]);

export const USER_ROLES = Object.freeze(["user", "admin"]);
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_NAME_LENGTH = 80;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_URL_LENGTH = 2048;
export const MIN_SHORT_CODE_LENGTH = 4;
export const MAX_SHORT_CODE_LENGTH = 32;
export const MAX_ALIAS_LENGTH = 64;
export const MAX_TOKEN_LENGTH = 512;

export function isValidEmail(value) {
  return typeof value === "string" && EMAIL_REGEX.test(value.trim());
}

export function isStrongEnoughPassword(value) {
  return (
    typeof value === "string" &&
    value.length >= MIN_PASSWORD_LENGTH &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value)
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
