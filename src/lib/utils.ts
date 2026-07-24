import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { formatCompactNumber } from "@/lib/numberFormatter";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number) {
  return formatCompactNumber(value);
}

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const MIN_NAME_LENGTH = 2;

const EMAIL_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;
const ALIAS_PATTERN = /^[A-Za-z0-9_-]{3,64}$/;
const RESERVED_ALIASES = new Set(["admin", "api", "docs", "health", "login", "register", "settings"]);
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "10minutemail.com",
  "guerrillamail.com",
  "mailinator.com",
  "tempmail.com",
  "throwawaymail.com",
  "yopmail.com",
]);

export function isValidEmail(value: string) {
  const email = value.trim().toLowerCase();
  const [, domain = ""] = email.split("@");

  return (
    EMAIL_PATTERN.test(email) &&
    email.length <= 254 &&
    !email.includes("..") &&
    !domain.startsWith("-") &&
    !domain.endsWith("-") &&
    !DISPOSABLE_EMAIL_DOMAINS.has(domain)
  );
}

export function validateEmail(value: string) {
  const email = value.trim();
  const [, domain = ""] = email.toLowerCase().split("@");

  if (!email) {
    return "Email is required.";
  }

  if (!EMAIL_PATTERN.test(email) || email.includes("..") || domain.startsWith("-") || domain.endsWith("-")) {
    return "Enter a valid email address.";
  }

  if (email.length > 254) {
    return "Email cannot exceed 254 characters.";
  }

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return "Use a permanent email address.";
  }

  return "";
}

export function normalizePhoneNumber(value: string) {
  const phone = value.replace(/[\s().-]/g, "").trim();
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : "";
}

export function validatePhoneNumber(value: string) {
  if (!value.trim()) {
    return "Phone number is required.";
  }

  if (!normalizePhoneNumber(value)) {
    return "Enter a valid international phone number, like +15551234567.";
  }

  return "";
}

export interface PasswordRequirement {
  key: string;
  label: string;
  met: boolean;
}

export function getPasswordRequirements(value: string): PasswordRequirement[] {
  return [
    { key: "length", label: "Minimum 8 characters", met: value.length >= MIN_PASSWORD_LENGTH },
    { key: "uppercase", label: "Uppercase", met: /[A-Z]/.test(value) },
    { key: "lowercase", label: "Lowercase", met: /[a-z]/.test(value) },
    { key: "number", label: "Number", met: /\d/.test(value) },
    { key: "special", label: "Special character", met: /[^A-Za-z0-9]/.test(value) },
  ];
}

export function validatePassword(value: string) {
  if (!value) {
    return "Password is required.";
  }

  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (value.length > MAX_PASSWORD_LENGTH) {
    return `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters.`;
  }

  if (!/[A-Z]/.test(value)) {
    return "Password must include at least one uppercase letter.";
  }

  if (!/[a-z]/.test(value)) {
    return "Password must include at least one lowercase letter.";
  }

  if (!/\d/.test(value)) {
    return "Password must include at least one number.";
  }

  if (!/[^A-Za-z0-9]/.test(value)) {
    return "Password must include at least one special character.";
  }

  return "";
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
