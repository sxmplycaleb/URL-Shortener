import { describe, expect, it, vi } from "vitest";

import { EmailValidationService, normalizeEmailAddress } from "../services/emailValidationService.js";

const baseConfig = {
  emailValidationEnabled: true,
  emailValidationFailurePolicy: "closed",
  kickboxApiKey: "kickbox-test-key",
};

function createService({ kickboxResponse, fetchImplementation, config = {}, auditLogger } = {}) {
  const fetchMock =
    fetchImplementation ??
    vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(kickboxResponse ?? { result: "deliverable", reason: "accepted_email" }),
    });

  return {
    fetchMock,
    service: new EmailValidationService({
      config: {
        ...baseConfig,
        ...config,
      },
      fetchImplementation: fetchMock,
      auditLogger: auditLogger ?? {
        error: vi.fn(),
      },
    }),
  };
}

describe("EmailValidationService", () => {
  it("normalizes email addresses before validation", () => {
    expect(normalizeEmailAddress("  USER@Example.COM ")).toBe("user@example.com");
    expect(normalizeEmailAddress("   ")).toBeNull();
  });

  it("accepts a deliverable Kickbox result and calls the verify endpoint with the normalized email", async () => {
    const { service, fetchMock } = createService();

    await expect(service.validate("  USER@Example.COM ")).resolves.toMatchObject({
      email: "user@example.com",
      provider: "kickbox",
      result: "deliverable",
    });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("https://api.kickbox.com/v2/verify");
    expect(url).toContain("email=user%40example.com");
    expect(url).toContain("apikey=kickbox-test-key");
    expect(options).toMatchObject({ method: "GET" });
  });

  it("rejects invalid syntax before calling Kickbox", async () => {
    const { service, fetchMock } = createService();

    await expect(service.validate("not-an-email")).rejects.toMatchObject({
      statusCode: 400,
      message: "Enter a valid permanent email address.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects disposable email addresses reported by Kickbox", async () => {
    const { service } = createService({
      kickboxResponse: { result: "risky", reason: "low_quality", disposable: true },
    });

    await expect(service.validate("person@trashmail.example")).rejects.toMatchObject({
      statusCode: 400,
      message: "Please use a permanent email address.",
    });
  });

  it("rejects addresses without valid mail records", async () => {
    const { service } = createService({
      kickboxResponse: { result: "undeliverable", reason: "invalid_domain", disposable: false },
    });

    await expect(service.validate("person@example.test")).rejects.toMatchObject({
      statusCode: 400,
      message: "Email domain must have valid mail records.",
    });
  });

  it("rejects undeliverable addresses", async () => {
    const { service } = createService({
      kickboxResponse: { result: "undeliverable", reason: "rejected_email", disposable: false },
    });

    await expect(service.validate("person@example.com")).rejects.toMatchObject({
      statusCode: 400,
      message: "This email address does not appear to be deliverable.",
    });
  });

  it("skips Kickbox when email validation is disabled", async () => {
    const { service, fetchMock } = createService({
      config: { emailValidationEnabled: false },
    });

    await expect(service.validate("person@example.com")).resolves.toMatchObject({
      email: "person@example.com",
      skipped: true,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed on Kickbox outages by default", async () => {
    const auditLogger = { error: vi.fn() };
    const { service } = createService({
      fetchImplementation: vi.fn().mockRejectedValue(new Error("network unavailable")),
      auditLogger,
    });

    await expect(service.validate("person@example.com")).rejects.toMatchObject({
      statusCode: 503,
      message: "We could not verify this email address right now. Please try again in a few minutes.",
    });
    expect(auditLogger.error).toHaveBeenCalledWith(
      "email_validation.kickbox_failed",
      expect.objectContaining({ email: "person@example.com", failPolicy: "closed" }),
    );
  });

  it("fails open when configured", async () => {
    const auditLogger = { error: vi.fn() };
    const { service } = createService({
      config: { emailValidationFailurePolicy: "open" },
      fetchImplementation: vi.fn().mockRejectedValue(new Error("network unavailable")),
      auditLogger,
    });

    await expect(service.validate("person@example.com")).resolves.toMatchObject({
      email: "person@example.com",
      result: "unknown",
      reason: "provider_unavailable",
    });
    expect(auditLogger.error).toHaveBeenCalled();
  });
});
