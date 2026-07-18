import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: value > 9999 ? "compact" : "standard" }).format(value);
}

export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALIAS_PATTERN = /^[A-Za-z0-9_-]{3,64}$/;
const RESERVED_ALIASES = new Set(["admin", "api", "docs", "health", "login", "register", "settings"]);

export function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value);
}

export function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidCustomAlias(value: string) {
  return ALIAS_PATTERN.test(value) && !RESERVED_ALIASES.has(value.toLowerCase());
}
