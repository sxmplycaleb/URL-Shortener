import { getEnv } from "../config/env.js";
import AppError from "../utils/AppError.js";
import { logger } from "../utils/logger.js";
import { isValidEmail } from "../utils/validators.js";

const KICKBOX_VERIFY_URL = "https://api.kickbox.com/v2/verify";
const DEFAULT_TIMEOUT_MS = 6000;
const FAILURE_MESSAGE =
  "We could not verify this email address right now. Please try again in a few minutes.";

export function normalizeEmailAddress(email) {
  return typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;
}

function messageForKickboxResult(result) {
  if (result.disposable === true) {
    return "Please use a permanent email address.";
  }

  if (result.reason === "invalid_email") {
    return "Enter a valid email address.";
  }

  if (result.reason === "invalid_domain") {
    return "Email domain must have valid mail records.";
  }

  if (result.result === "undeliverable") {
    return "This email address does not appear to be deliverable.";
  }

  return null;
}

export class EmailValidationService {
  constructor({
    config = getEnv(),
    fetchImplementation = globalThis.fetch,
    auditLogger = logger,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = {}) {
    this.config = config;
    this.fetchImplementation = fetchImplementation;
    this.auditLogger = auditLogger;
    this.timeoutMs = timeoutMs;
  }

  async validate(email) {
    const normalizedEmail = normalizeEmailAddress(email);

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      throw new AppError("Enter a valid permanent email address.", 400);
    }

    if (!this.config.emailValidationEnabled) {
      return {
        email: normalizedEmail,
        skipped: true,
      };
    }

    const kickboxResult = await this.verifyWithKickbox(normalizedEmail);
    const message = messageForKickboxResult(kickboxResult);

    if (message) {
      throw new AppError(message, 400);
    }

    return {
      email: normalizedEmail,
      skipped: false,
      provider: "kickbox",
      result: kickboxResult.result,
      reason: kickboxResult.reason,
    };
  }

  async verifyWithKickbox(email) {
    if (!this.config.kickboxApiKey) {
      return this.handleProviderFailure(new Error("KICKBOX_API_KEY is not configured."), email);
    }

    if (typeof this.fetchImplementation !== "function") {
      return this.handleProviderFailure(new Error("Fetch API is not available for Kickbox validation."), email);
    }

    const controller =
      typeof globalThis.AbortController === "function" ? new globalThis.AbortController() : null;
    const timeout = controller ? globalThis.setTimeout(() => controller.abort(), this.timeoutMs) : null;
    const url = new URL(KICKBOX_VERIFY_URL);
    url.searchParams.set("email", email);
    url.searchParams.set("apikey", this.config.kickboxApiKey);
    url.searchParams.set("timeout", String(this.timeoutMs));

    try {
      const response = await this.fetchImplementation(url.toString(), {
        method: "GET",
        ...(controller ? { signal: controller.signal } : {}),
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Kickbox responded with HTTP ${response.status}.`);
      }

      const body = await response.json();

      if (body.success === false) {
        throw new Error(body.message || "Kickbox validation was unsuccessful.");
      }

      return body;
    } catch (error) {
      return this.handleProviderFailure(error, email);
    } finally {
      if (timeout) {
        globalThis.clearTimeout(timeout);
      }
    }
  }

  handleProviderFailure(error, email) {
    this.auditLogger.error("email_validation.kickbox_failed", {
      email,
      failPolicy: this.config.emailValidationFailurePolicy,
      error,
    });

    if (this.config.emailValidationFailurePolicy === "open") {
      return {
        result: "unknown",
        reason: "provider_unavailable",
        disposable: false,
      };
    }

    throw new AppError(FAILURE_MESSAGE, 503);
  }
}

export function createEmailValidationService() {
  return new EmailValidationService();
}
