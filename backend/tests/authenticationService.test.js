import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { connectDatabase, disconnectDatabase } from "../config/database.js";
import OTP from "../models/OTP.js";
import { AuthenticationService } from "../services/authenticationService.js";
import { BrevoEmailProvider } from "../services/otpProviders.js";

let mongoServer;
let now;

const baseConfig = {
  nodeEnv: "test",
  otpExpiryMinutes: 5,
  otpResendCooldownMs: 0,
  otpGenerationRateLimitWindowMs: 15 * 60 * 1000,
  otpGenerationRateLimitMax: 5,
  otpVerificationRateLimitWindowMs: 15 * 60 * 1000,
  otpVerificationRateLimitMax: 5,
};

function createService(overrides = {}) {
  return new AuthenticationService({
    otpModel: OTP,
    emailProvider: {
      sendOtp: vi.fn().mockResolvedValue({ provider: "brevo", delivered: true }),
    },
    phoneProvider: {
      sendOtp: vi.fn().mockResolvedValue({ provider: "twilio_verify", delivered: true }),
    },
    auditLogger: {
      info: vi.fn(),
      warn: vi.fn(),
    },
    now: () => now,
    generateOtp: () => "123456",
    config: {
      ...baseConfig,
      ...overrides,
    },
  });
}

describe("AuthenticationService OTP foundation", () => {
  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.HASH_SALT = "test-hash-salt-value";

    mongoServer = await MongoMemoryServer.create();
    await connectDatabase({
      uri: mongoServer.getUri(),
      maxRetries: 1,
      mongooseOptions: { dbName: "auth-service-test" },
    });
    await OTP.syncIndexes();
  }, 900_000);

  beforeEach(async () => {
    now = new Date("2026-07-24T00:00:00.000Z");
    await OTP.deleteMany({});
  });

  afterAll(async () => {
    await disconnectDatabase();
    await mongoServer?.stop();
  });

  it("generates, hashes, stores, and delivers an email OTP", async () => {
    const service = createService();

    const response = await service.requestOtp({
      email: "USER@example.com",
      purpose: "LOGIN",
      channel: "email",
    });

    expect(response).toMatchObject({
      otp: "123456",
      channel: "email",
      delivery: {
        provider: "brevo",
        delivered: true,
      },
    });

    const storedOtp = await OTP.findOne({ email: "user@example.com" }).select("+hashedOtp");
    expect(storedOtp.hashedOtp).toHaveLength(64);
    expect(storedOtp.hashedOtp).not.toBe("123456");
    expect(storedOtp.expiresAt.toISOString()).toBe("2026-07-24T00:05:00.000Z");
    expect(storedOtp.attempts).toBe(0);
    expect(storedOtp.used).toBe(false);
  });

  it("invalidates previous unused OTPs when a new code is issued", async () => {
    const service = createService({ otpResendCooldownMs: 0 });

    const first = await service.requestOtp({ email: "same@example.com", purpose: "REGISTER" });
    now = new Date("2026-07-24T00:01:01.000Z");
    const second = await service.requestOtp({ email: "same@example.com", purpose: "REGISTER" });

    const firstRecord = await OTP.findById(first.otpId);
    const secondRecord = await OTP.findById(second.otpId);

    expect(firstRecord.used).toBe(true);
    expect(secondRecord.used).toBe(false);
  });

  it("verifies a valid OTP once and prevents reuse", async () => {
    const service = createService();

    await service.requestOtp({ phone: "+15551234567", purpose: "CHANGE_PHONE", channel: "sms" });

    await expect(
      service.verifyOtp({
        phone: "+15551234567",
        purpose: "CHANGE_PHONE",
        otp: "123456",
      }),
    ).resolves.toMatchObject({
      verified: true,
      phone: "+15551234567",
      purpose: "CHANGE_PHONE",
    });

    await expect(
      service.verifyOtp({
        phone: "+15551234567",
        purpose: "CHANGE_PHONE",
        otp: "123456",
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects expired OTPs", async () => {
    const service = createService();

    await service.requestOtp({ email: "expired@example.com", purpose: "RESET_PASSWORD" });
    now = new Date("2026-07-24T00:05:01.000Z");

    await expect(
      service.verifyOtp({
        email: "expired@example.com",
        purpose: "RESET_PASSWORD",
        otp: "123456",
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("enforces maximum verification attempts and marks the OTP used", async () => {
    const service = createService();

    await service.requestOtp({ email: "attempts@example.com", purpose: "LOGIN" });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        service.verifyOtp({
          email: "attempts@example.com",
          purpose: "LOGIN",
          otp: "000000",
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
    }

    const storedOtp = await OTP.findOne({ email: "attempts@example.com" });
    expect(storedOtp.attempts).toBe(5);
    expect(storedOtp.used).toBe(true);
  });

  it("rate limits OTP generation", async () => {
    const service = createService({
      otpGenerationRateLimitMax: 2,
      otpGenerationRateLimitWindowMs: 60 * 1000,
    });

    await service.requestOtp({ email: "limited@example.com", purpose: "LOGIN" });
    now = new Date("2026-07-24T00:00:01.000Z");
    await service.requestOtp({ email: "limited@example.com", purpose: "LOGIN" });
    now = new Date("2026-07-24T00:00:02.000Z");

    await expect(service.requestOtp({ email: "limited@example.com", purpose: "LOGIN" })).rejects.toMatchObject({
      statusCode: 429,
    });
  });

  it("rate limits OTP verification attempts within the configured window", async () => {
    const service = createService({
      otpVerificationRateLimitMax: 2,
      otpVerificationRateLimitWindowMs: 60 * 1000,
    });

    await service.requestOtp({ email: "verify-limited@example.com", purpose: "LOGIN" });

    await expect(
      service.verifyOtp({ email: "verify-limited@example.com", purpose: "LOGIN", otp: "000000" }),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      service.verifyOtp({ email: "verify-limited@example.com", purpose: "LOGIN", otp: "000000" }),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      service.verifyOtp({ email: "verify-limited@example.com", purpose: "LOGIN", otp: "000000" }),
    ).rejects.toMatchObject({ statusCode: 429 });
  });
});

describe("BrevoEmailProvider", () => {
  it("sends OTP emails with the Brevo transactional email API", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue({ ok: true });
    const provider = new BrevoEmailProvider({
      apiKey: "brevo-api-key",
      senderName: "Shortly",
      senderEmail: "no-reply@example.com",
      expiresInMinutes: 7,
      fetchImplementation,
    });

    await expect(
      provider.sendOtp({
        email: "user@example.com",
        otp: "123456",
        purpose: "LOGIN",
      }),
    ).resolves.toEqual({ provider: "brevo", delivered: true });

    expect(fetchImplementation).toHaveBeenCalledWith(
      "https://api.brevo.com/v3/smtp/email",
      expect.objectContaining({
        method: "POST",
        headers: {
          "api-key": "brevo-api-key",
          "Content-Type": "application/json",
        },
      }),
    );

    const [, requestOptions] = fetchImplementation.mock.calls[0];
    expect(JSON.parse(requestOptions.body)).toMatchObject({
      sender: { name: "Shortly", email: "no-reply@example.com" },
      to: [{ email: "user@example.com" }],
      subject: "Your Shortly login code",
      textContent: expect.stringContaining("123456"),
      tags: ["auth", "otp", "login"],
    });
  });

  it("sends password reset links through Brevo", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue({ ok: true });
    const provider = new BrevoEmailProvider({
      apiKey: "brevo-api-key",
      senderEmail: "no-reply@example.com",
      fetchImplementation,
    });

    await provider.sendPasswordResetLink({
      email: "reset@example.com",
      resetUrl: "https://shortly.example.com/reset-password?token=abc",
    });

    const [, requestOptions] = fetchImplementation.mock.calls[0];
    expect(JSON.parse(requestOptions.body)).toMatchObject({
      to: [{ email: "reset@example.com" }],
      subject: "Reset your Shortly password",
      textContent: expect.stringContaining("https://shortly.example.com/reset-password?token=abc"),
      tags: ["auth", "password-reset-link"],
    });
  });
});
