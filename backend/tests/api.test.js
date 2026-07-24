import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { getEnv } from "../config/env.js";
import Click from "../models/Click.js";
import LoginHistory from "../models/LoginHistory.js";
import RefreshToken from "../models/RefreshToken.js";
import OTP from "../models/OTP.js";
import TrustedDevice from "../models/TrustedDevice.js";
import URLModel from "../models/URL.js";
import User from "../models/User.js";
import { parseUserAgent } from "../services/securityMetadata.js";

const { verifyGoogleIdTokenMock } = vi.hoisted(() => ({
  verifyGoogleIdTokenMock: vi.fn(),
}));

vi.mock("../services/firebaseAdmin.js", () => ({
  verifyGoogleIdToken: verifyGoogleIdTokenMock,
}));

let app;
let mongoServer;

async function syncModelIndexes() {
  await Promise.all([
    User.syncIndexes(),
    URLModel.syncIndexes(),
    Click.syncIndexes(),
    RefreshToken.syncIndexes(),
    OTP.syncIndexes(),
    LoginHistory.syncIndexes(),
    TrustedDevice.syncIndexes(),
  ]);
}

async function registerAndLogin(email = "api@example.com") {
  const response = await request(app).post("/api/auth/register").send({
    name: "API User",
    email,
    password: "Password123!",
  });

  expect(response.status).toBe(201);
  expect(response.body.accessToken).toEqual(expect.any(String));
  return response.body;
}

describe("backend API", () => {
  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.HASH_SALT = "test-hash-salt-value";
    process.env.BCRYPT_SALT_ROUNDS = "4";
    process.env.JWT_SECRET = "test-access-secret-with-enough-length";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret-with-enough-length";
    process.env.JWT_ACCESS_EXPIRES_IN = "15m";
    process.env.JWT_REFRESH_EXPIRES_IN = "7d";
    process.env.RATE_LIMIT_MAX = "1000";
    process.env.AUTH_RATE_LIMIT_MAX = "1000";
    process.env.PASSWORD_RATE_LIMIT_MAX = "1000";
    process.env.OTP_VERIFICATION_RATE_LIMIT_MAX = "5";
    process.env.ACCOUNT_LOCK_MAX_ATTEMPTS = "5";
    process.env.BREVO_API_KEY = "";
    process.env.BREVO_SENDER_EMAIL = "";
    process.env.TWILIO_ACCOUNT_SID = "";
    process.env.TWILIO_AUTH_TOKEN = "";
    process.env.TWILIO_VERIFY_SERVICE_SID = "";
    // TODO: Re-enable when Meta WhatsApp Cloud API integration is implemented.
    // process.env.META_WHATSAPP_ACCESS_TOKEN = "";
    // process.env.META_WHATSAPP_PHONE_NUMBER_ID = "";
    // process.env.META_WHATSAPP_TEMPLATE_NAME = "";
    // process.env.META_WHATSAPP_TEMPLATE_LANGUAGE = "";
    // process.env.META_WHATSAPP_API_VERSION = "";
    process.env.CLIENT_URL = "http://localhost:5173";
    process.env.SHORT_URL_BASE = "https://short.ly";
    process.env.FIREBASE_PROJECT_ID = "url-shortener-test";
    process.env.FIREBASE_CLIENT_EMAIL = "firebase-admin@example.iam.gserviceaccount.com";
    process.env.FIREBASE_PRIVATE_KEY = "test-private-key";

    const appModule = await import("../app.js");
    app = appModule.createApp();

    mongoServer = await MongoMemoryServer.create();
    await connectDatabase({
      uri: mongoServer.getUri(),
      maxRetries: 1,
      mongooseOptions: { dbName: "url-shortener-api-test" },
    });
    await syncModelIndexes();
  }, 900_000);

  beforeEach(async () => {
    await Promise.all([
      Click.deleteMany({}),
      URLModel.deleteMany({}),
      RefreshToken.deleteMany({}),
      OTP.deleteMany({}),
      LoginHistory.deleteMany({}),
      TrustedDevice.deleteMany({}),
      User.deleteMany({}),
    ]);
    verifyGoogleIdTokenMock.mockReset();
  });

  afterAll(async () => {
    await disconnectDatabase();
    await mongoServer?.stop();
  });

  it("registers users and stores a hashed refresh token", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "New User",
      email: "new@example.com",
      password: "Password123!",
    });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe("new@example.com");
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toBeUndefined();
    expect(response.headers["set-cookie"]?.join(";")).toContain("refreshToken=");

    const tokens = await RefreshToken.find({});
    expect(tokens).toHaveLength(1);
    expect(tokens[0].tokenHash).toHaveLength(64);
  });

  it("rejects invalid registration payloads with a consistent error response", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "A",
      email: "person@mailinator.com",
      password: "password",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        message: expect.any(String),
      },
    });
  });

  it("logs in users with valid credentials", async () => {
    await User.create({
      name: "Login User",
      email: "login@example.com",
      password: "Password123!",
    });

    const response = await request(app).post("/api/auth/login").send({
      email: "login@example.com",
      password: "Password123!",
    });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe("login@example.com");
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toBeUndefined();
  });

  it("creates a Google user and returns the normal auth session", async () => {
    const firebaseIdToken = "a".repeat(1500);

    verifyGoogleIdTokenMock.mockResolvedValue({
      uid: "google-new-user",
      email: "google-new@example.com",
      email_verified: true,
      name: "Google New",
      picture: "https://lh3.googleusercontent.com/avatar.png",
    });

    const response = await request(app).post("/api/auth/google").send({
      idToken: firebaseIdToken,
    });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.expiresIn).toBe("15m");
    expect(response.body.refreshToken).toBeUndefined();
    expect(response.body.user).toMatchObject({
      name: "Google New",
      email: "google-new@example.com",
      provider: "google",
      avatar: "https://lh3.googleusercontent.com/avatar.png",
      emailVerified: true,
      authProviders: {
        email: false,
        google: true,
      },
    });
    expect(response.headers["set-cookie"]?.join(";")).toContain("refreshToken=");

    const user = await User.findOne({ email: "google-new@example.com" });
    expect(user.googleId).toBe("google-new-user");
    expect(user.lastLogin).toBeInstanceOf(Date);
    expect(verifyGoogleIdTokenMock).toHaveBeenCalledWith(firebaseIdToken);
  });

  it("links Google to an existing verified email account and updates last login", async () => {
    await User.create({
      name: "Existing Email",
      email: "existing-google@example.com",
      password: "Password123!",
    });
    verifyGoogleIdTokenMock.mockResolvedValue({
      uid: "google-existing-user",
      email: "existing-google@example.com",
      email_verified: true,
      name: "Existing Google",
      picture: "https://lh3.googleusercontent.com/existing.png",
    });

    const response = await request(app).post("/api/auth/google").send({
      idToken: "valid-existing-token",
    });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      email: "existing-google@example.com",
      provider: "email",
      avatar: "https://lh3.googleusercontent.com/existing.png",
      authProviders: {
        email: true,
        google: true,
      },
    });
    expect(response.body.user.authProviders.googleLinkedAt).toEqual(expect.any(String));

    const user = await User.findOne({ email: "existing-google@example.com" });
    expect(user.googleId).toBe("google-existing-user");
    expect(user.lastLogin).toBeInstanceOf(Date);
  });

  it("rejects invalid Google tokens", async () => {
    verifyGoogleIdTokenMock.mockRejectedValue({ code: "auth/argument-error" });

    const response = await request(app).post("/api/auth/google").send({
      idToken: "invalid-google-token",
    });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe("Google sign-in could not be verified. Please try again.");
  });

  it("rejects expired Google tokens with a friendly error", async () => {
    verifyGoogleIdTokenMock.mockRejectedValue({ code: "auth/id-token-expired" });

    const response = await request(app).post("/api/auth/google").send({
      idToken: "expired-google-token",
    });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe("Google sign-in expired. Please try again.");
  });

  it("rejects malformed Google auth requests", async () => {
    const response = await request(app).post("/api/auth/google").send({
      token: "wrong-field",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("idToken is required.");
    expect(verifyGoogleIdTokenMock).not.toHaveBeenCalled();
  });

  it("rotates refresh tokens and rejects reuse", async () => {
    const agent = request.agent(app);

    const registerResponse = await agent.post("/api/auth/register").send({
      name: "Refresh User",
      email: "refresh@example.com",
      password: "Password123!",
    });
    const originalCookie = registerResponse.headers["set-cookie"];

    const refreshResponse = await agent.post("/api/auth/refresh").send();

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.user.email).toBe("refresh@example.com");
    expect(refreshResponse.body.accessToken).toEqual(expect.any(String));
    expect(refreshResponse.body.refreshToken).toBeUndefined();

    const reuseResponse = await request(app).post("/api/auth/refresh").set("Cookie", originalCookie).send();

    expect(reuseResponse.status).toBe(401);
  });

  it("exposes and manages authenticated security center data", async () => {
    const firstAgent = request.agent(app);
    const secondAgent = request.agent(app);
    const user = {
      name: "Security User",
      email: "security-center@example.com",
      password: "Password123!",
    };

    const registerResponse = await firstAgent
      .post("/api/auth/register")
      .set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0")
      .set("CF-IPCountry", "US")
      .send(user);
    expect(registerResponse.status).toBe(201);

    const failedLogin = await request(app).post("/api/auth/login").send({
      email: user.email,
      password: "WrongPassword123!",
    });
    expect(failedLogin.status).toBe(401);

    const secondLogin = await secondAgent
      .post("/api/auth/login")
      .set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Firefox/121.0")
      .send({
        email: user.email,
        password: user.password,
        rememberDevice: true,
      });
    expect(secondLogin.status).toBe(200);

    const securityResponse = await secondAgent.get("/api/security").set("Authorization", `Bearer ${secondLogin.body.accessToken}`);

    expect(securityResponse.status).toBe(200);
    expect(securityResponse.body.sessions).toHaveLength(2);
    expect(securityResponse.body.sessions).toContainEqual(
      expect.objectContaining({
        browser: "Firefox",
        device: "Desktop",
        operatingSystem: "macOS",
        current: true,
      }),
    );
    expect(securityResponse.body.sessions).toContainEqual(expect.objectContaining({ country: "US" }));
    expect(securityResponse.body.loginHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "success", method: "email_password" }),
        expect.objectContaining({ status: "failed", method: "email_password" }),
      ]),
    );
    expect(securityResponse.body.trustedDevices).toHaveLength(1);

    const currentSession = securityResponse.body.sessions.find((session) => session.current);
    const otherSession = securityResponse.body.sessions.find((session) => !session.current);

    const rejectCurrent = await secondAgent
      .delete(`/api/security/sessions/${currentSession.id}`)
      .set("Authorization", `Bearer ${secondLogin.body.accessToken}`)
      .send({});
    expect(rejectCurrent.status).toBe(409);

    const rejectWithoutCurrentCookie = await request(app)
      .delete("/api/security/sessions")
      .set("Authorization", `Bearer ${secondLogin.body.accessToken}`);
    expect(rejectWithoutCurrentCookie.status).toBe(401);
    expect(rejectWithoutCurrentCookie.body.error.message).toBe("Current session could not be verified.");

    const sessionsResponse = await secondAgent
      .get("/api/security/sessions")
      .set("Authorization", `Bearer ${secondLogin.body.accessToken}`);
    const trustedDevicesResponse = await secondAgent
      .get("/api/security/trusted-devices")
      .set("Authorization", `Bearer ${secondLogin.body.accessToken}`);
    const loginHistoryResponse = await secondAgent
      .get("/api/security/login-history")
      .set("Authorization", `Bearer ${secondLogin.body.accessToken}`);
    expect(sessionsResponse.status).toBe(200);
    expect(sessionsResponse.body.sessions).toHaveLength(2);
    expect(trustedDevicesResponse.status).toBe(200);
    expect(trustedDevicesResponse.body.trustedDevices).toHaveLength(1);
    expect(loginHistoryResponse.status).toBe(200);
    expect(loginHistoryResponse.body.loginHistory).toEqual(
      expect.arrayContaining([expect.objectContaining({ browser: "Firefox", operatingSystem: "macOS" })]),
    );

    const revokeOther = await secondAgent
      .delete(`/api/security/sessions/${otherSession.id}`)
      .set("Authorization", `Bearer ${secondLogin.body.accessToken}`)
      .send({});
    expect(revokeOther.status).toBe(200);
    expect(revokeOther.body.revokedCurrent).toBe(false);
    await expect(RefreshToken.find({ user: secondLogin.body.user.id, revoked: false })).resolves.toHaveLength(1);

    const settingsResponse = await secondAgent
      .put("/api/security/settings")
      .set("Authorization", `Bearer ${secondLogin.body.accessToken}`)
      .send({ emailOtpEnabled: false, smsOtpEnabled: true });
    expect(settingsResponse.status).toBe(200);
    expect(settingsResponse.body.user.accountSettings).toMatchObject({
      emailOtpEnabled: false,
      smsOtpEnabled: true,
    });

    const trustedDeviceId = securityResponse.body.trustedDevices[0].id;
    const removeTrustedResponse = await secondAgent
      .delete(`/api/security/trusted-devices/${trustedDeviceId}`)
      .set("Authorization", `Bearer ${secondLogin.body.accessToken}`);
    expect(removeTrustedResponse.status).toBe(204);
    await expect(TrustedDevice.find({ user: secondLogin.body.user.id })).resolves.toHaveLength(0);
  });

  it("locks an account temporarily after repeated failed password logins", async () => {
    const originalMaxAttempts = process.env.ACCOUNT_LOCK_MAX_ATTEMPTS;
    process.env.ACCOUNT_LOCK_MAX_ATTEMPTS = "3";

    await User.create({
      name: "Locked User",
      email: "locked@example.com",
      password: "Password123!",
    });

    try {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const response = await request(app).post("/api/auth/login").send({
          email: "locked@example.com",
          password: "WrongPassword123!",
        });
        expect(response.status).toBe(401);
      }

      const lockedResponse = await request(app).post("/api/auth/login").send({
        email: "locked@example.com",
        password: "Password123!",
      });

      expect(lockedResponse.status).toBe(423);
      expect(lockedResponse.body.error.message).toContain("Account temporarily locked");

      const lockedUser = await User.findOne({ email: "locked@example.com" });
      expect(lockedUser.failedLoginAttempts).toBe(3);
      expect(lockedUser.lockUntil).toBeInstanceOf(Date);
    } finally {
      if (originalMaxAttempts === undefined) {
        delete process.env.ACCOUNT_LOCK_MAX_ATTEMPTS;
      } else {
        process.env.ACCOUNT_LOCK_MAX_ATTEMPTS = originalMaxAttempts;
      }
    }
  });

  it("sends a Brevo notification when a successful login uses a previously unseen device", async () => {
    const originalApiKey = process.env.BREVO_API_KEY;
    const originalSender = process.env.BREVO_SENDER_EMAIL;
    const originalFetch = globalThis.fetch;
    const fetchImplementation = vi.fn().mockResolvedValue({ ok: true });

    process.env.BREVO_API_KEY = "brevo-test-key";
    process.env.BREVO_SENDER_EMAIL = "security@example.com";
    globalThis.fetch = fetchImplementation;

    await User.create({
      name: "New Device User",
      email: "new-device@example.com",
      password: "Password123!",
    });

    try {
      const response = await request(app)
        .post("/api/auth/login")
        .set("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0")
        .set("CF-IPCountry", "KE")
        .send({
          email: "new-device@example.com",
          password: "Password123!",
        });

      expect(response.status).toBe(200);
      expect(fetchImplementation).toHaveBeenCalledWith(
        "https://api.brevo.com/v3/smtp/email",
        expect.objectContaining({ method: "POST" }),
      );

      const [, requestOptions] = fetchImplementation.mock.calls[0];
      expect(JSON.parse(requestOptions.body)).toMatchObject({
        to: [{ email: "new-device@example.com" }],
        subject: "New sign-in to your Shortly account",
        tags: ["auth", "new-device"],
      });
    } finally {
      if (originalApiKey === undefined) {
        delete process.env.BREVO_API_KEY;
      } else {
        process.env.BREVO_API_KEY = originalApiKey;
      }
      if (originalSender === undefined) {
        delete process.env.BREVO_SENDER_EMAIL;
      } else {
        process.env.BREVO_SENDER_EMAIL = originalSender;
      }
      globalThis.fetch = originalFetch;
    }
  });

  it("prevents users from reading or mutating another user's security records", async () => {
    const firstAgent = request.agent(app);
    const secondAgent = request.agent(app);

    const firstUser = await firstAgent.post("/api/auth/register").send({
      name: "First Security User",
      email: "first-security@example.com",
      password: "Password123!",
    });
    const secondUser = await secondAgent.post("/api/auth/register").send({
      name: "Second Security User",
      email: "second-security@example.com",
      password: "Password123!",
    });
    expect(firstUser.status).toBe(201);
    expect(secondUser.status).toBe(201);

    const firstSecurity = await firstAgent.get("/api/security").set("Authorization", `Bearer ${firstUser.body.accessToken}`);
    const secondSecurity = await secondAgent.get("/api/security").set("Authorization", `Bearer ${secondUser.body.accessToken}`);
    expect(firstSecurity.body.sessions).toHaveLength(1);
    expect(secondSecurity.body.sessions).toHaveLength(1);
    expect(firstSecurity.body.sessions[0].id).not.toBe(secondSecurity.body.sessions[0].id);

    const crossUserRevoke = await secondAgent
      .delete(`/api/security/sessions/${firstSecurity.body.sessions[0].id}`)
      .set("Authorization", `Bearer ${secondUser.body.accessToken}`)
      .send({});
    expect(crossUserRevoke.status).toBe(404);

    const firstSessionAfterAttempt = await RefreshToken.findById(firstSecurity.body.sessions[0].id);
    expect(firstSessionAfterAttempt.revoked).toBe(false);
  });

  it("detects iOS browsers without misclassifying them as macOS", () => {
    expect(
      parseUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/120.0 Mobile/15E148 Safari/604.1",
      ),
    ).toMatchObject({
      browser: "Chrome",
      device: "Mobile",
      operatingSystem: "iOS",
    });
  });

  it("protects authenticated URL routes", async () => {
    const response = await request(app).get("/api/urls");

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe("Authentication required.");
  });

  it("creates and retrieves URLs for the authenticated user", async () => {
    const auth = await registerAndLogin();

    const createResponse = await request(app)
      .post("/api/urls")
      .set("Authorization", `Bearer ${auth.accessToken}`)
      .send({
        originalUrl: "https://example.com/article",
        customAlias: "article1",
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.url.shortCode).toBe("article1");
    expect(createResponse.body.url.shortUrl).toBe("https://short.ly/article1");

    const listResponse = await request(app).get("/api/urls").set("Authorization", `Bearer ${auth.accessToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.urls).toHaveLength(1);
    expect(listResponse.body.urls[0].originalUrl).toBe("https://example.com/article");

    const getResponse = await request(app)
      .get(`/api/urls/${createResponse.body.url.id}`)
      .set("Authorization", `Bearer ${auth.accessToken}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.url.shortCode).toBe("article1");
  });

  it("redirects active short URLs and tracks clicks", async () => {
    const auth = await registerAndLogin("redirect@example.com");
    const createResponse = await request(app)
      .post("/api/urls")
      .set("Authorization", `Bearer ${auth.accessToken}`)
      .send({
        originalUrl: "https://example.com/landing",
        customAlias: "landing",
      });

    const redirectResponse = await request(app)
      .get("/landing")
      .set("User-Agent", "Mozilla/5.0 Chrome/120.0")
      .set("Referer", "https://referrer.example");

    expect(redirectResponse.status).toBe(302);
    expect(redirectResponse.headers.location).toBe("https://example.com/landing");

    const url = await URLModel.findById(createResponse.body.url.id);
    const clicks = await Click.find({ url: createResponse.body.url.id });

    expect(url.clickCount).toBe(1);
    expect(clicks).toHaveLength(1);
    expect(clicks[0].browser).toBe("Chrome");
    expect(clicks[0].referrer).toBe("https://referrer.example");
  });

  it("renders friendly pages for missing, disabled, and expired short URLs without tracking clicks", async () => {
    const auth = await registerAndLogin("redirect-states@example.com");
    const disabledResponse = await request(app)
      .post("/api/urls")
      .set("Authorization", `Bearer ${auth.accessToken}`)
      .send({
        originalUrl: "https://example.com/disabled",
        customAlias: "disabled",
      });
    const expiredUrl = await URLModel.create({
      originalUrl: "https://example.com/expired",
      shortCode: "expired",
      user: auth.user.id,
      expiresAt: new Date(Date.now() + 60_000),
    });

    await URLModel.updateOne({ _id: disabledResponse.body.url.id }, { isActive: false });
    await URLModel.updateOne({ _id: expiredUrl._id }, { expiresAt: new Date(Date.now() - 60_000) }, { runValidators: false });

    const missing = await request(app).get("/missing-link");
    const disabled = await request(app).get("/disabled");
    const expired = await request(app).get("/expired");

    expect(missing.status).toBe(404);
    expect(missing.text).toContain("Link not found");
    expect(disabled.status).toBe(410);
    expect(disabled.text).toContain("Link disabled");
    expect(expired.status).toBe(410);
    expect(expired.text).toContain("Link expired");
    await expect(Click.find({})).resolves.toHaveLength(0);
  });

  it("supports the forgot password request and reset flow", async () => {
    await User.create({
      name: "Reset User",
      email: "reset@example.com",
      password: "Password123!",
    });

    const forgotResponse = await request(app).post("/api/auth/forgot-password").send({
      email: "reset@example.com",
    });

    expect(forgotResponse.status).toBe(200);
    expect(forgotResponse.body.message).toContain("If an account exists");
    expect(forgotResponse.body.resetUrl).toEqual(expect.stringContaining("/reset-password?token="));

    const resetUrl = new URL(forgotResponse.body.resetUrl);
    const token = resetUrl.searchParams.get("token");
    const resetResponse = await request(app).post("/api/auth/reset-password").send({
      token,
      password: "NewPassword123!",
    });

    expect(resetResponse.status).toBe(200);
    expect(resetResponse.body.message).toContain("password has been reset");

    const oldLogin = await request(app).post("/api/auth/login").send({
      email: "reset@example.com",
      password: "Password123!",
    });
    const newLogin = await request(app).post("/api/auth/login").send({
      email: "reset@example.com",
      password: "NewPassword123!",
    });
    const reuse = await request(app).post("/api/auth/reset-password").send({
      token,
      password: "AnotherPassword123!",
    });

    expect(oldLogin.status).toBe(401);
    expect(newLogin.status).toBe(200);
    expect(reuse.status).toBe(400);
  });

  it("supports phone OTP registration, login, and password reset", async () => {
    const phoneRequest = await request(app).post("/api/auth/phone/request").send({
      phone: "+1 (555) 123-4567",
      purpose: "REGISTER",
      channel: "sms",
    });

    expect(phoneRequest.status).toBe(202);
    expect(phoneRequest.body.phone).toBeUndefined();
    expect(phoneRequest.body.otp).toMatch(/^\d{6}$/);

    const phoneVerify = await request(app).post("/api/auth/phone/verify").send({
      phone: "+15551234567",
      purpose: "REGISTER",
      otp: phoneRequest.body.otp,
    });

    expect(phoneVerify.status).toBe(200);
    expect(phoneVerify.body).toMatchObject({
      verified: true,
      phone: "+15551234567",
      purpose: "REGISTER",
    });

    const registerResponse = await request(app).post("/api/auth/register").send({
      name: "Phone User",
      email: "phone@example.com",
      password: "Password123!",
      phone: "+15551234567",
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.user).toMatchObject({
      email: "phone@example.com",
      phone: "+15551234567",
      phoneVerified: true,
    });

    const loginRequest = await request(app).post("/api/auth/phone/request").send({
      phone: "+15551234567",
      purpose: "LOGIN",
      channel: "sms",
    });
    expect(loginRequest.status).toBe(202);

    const loginVerify = await request(app).post("/api/auth/phone/verify").send({
      phone: "+15551234567",
      purpose: "LOGIN",
      otp: loginRequest.body.otp,
    });
    expect(loginVerify.status).toBe(200);
    expect(loginVerify.body.accessToken).toEqual(expect.any(String));
    expect(loginVerify.body.user.email).toBe("phone@example.com");

    const resetRequest = await request(app).post("/api/auth/phone/request").send({
      phone: "+15551234567",
      purpose: "RESET_PASSWORD",
      channel: "sms",
    });
    expect(resetRequest.status).toBe(202);

    const resetVerify = await request(app).post("/api/auth/phone/verify").send({
      phone: "+15551234567",
      purpose: "RESET_PASSWORD",
      otp: resetRequest.body.otp,
    });
    expect(resetVerify.status).toBe(200);
    expect(resetVerify.body.resetUrl).toEqual(expect.stringContaining("/reset-password?token="));
  });

  it("rejects WhatsApp OTP requests and verifications while the integration is disabled", async () => {
    const requestResponse = await request(app).post("/api/auth/phone/request").send({
      phone: "+15551234567",
      purpose: "LOGIN",
      channel: "whatsapp",
    });
    const verifyResponse = await request(app).post("/api/auth/phone/verify").send({
      phone: "+15551234567",
      purpose: "LOGIN",
      channel: "whatsapp",
      otp: "123456",
    });

    expect(requestResponse.status).toBe(400);
    expect(requestResponse.body).toEqual({ message: "WhatsApp OTP is temporarily unavailable." });
    expect(verifyResponse.status).toBe(400);
    expect(verifyResponse.body).toEqual({ message: "WhatsApp OTP is temporarily unavailable." });
  });

  it("returns analytics for the authenticated URL owner", async () => {
    const auth = await registerAndLogin("analytics-api@example.com");
    const createResponse = await request(app)
      .post("/api/urls")
      .set("Authorization", `Bearer ${auth.accessToken}`)
      .send({
        originalUrl: "https://example.com/stats",
        customAlias: "stats1",
      });

    await request(app).get("/stats1");

    const analyticsResponse = await request(app)
      .get(`/api/analytics/${createResponse.body.url.id}`)
      .set("Authorization", `Bearer ${auth.accessToken}`);

    expect(analyticsResponse.status).toBe(200);
    expect(analyticsResponse.body.analytics.totalClicks).toBe(1);
    expect(analyticsResponse.body.analytics.recentClicks).toHaveLength(1);
    expect(analyticsResponse.body.analytics.url.shortCode).toBe("stats1");
  });

  it("reports database readiness for deployment health checks", async () => {
    const response = await request(app).get("/api/ready");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ready",
      database: "connected",
    });
  });

  it("exposes top-level health and readiness endpoints for platform checks", async () => {
    const healthResponse = await request(app).get("/health");
    const readyResponse = await request(app).get("/ready");

    expect(healthResponse.status).toBe(200);
    expect(healthResponse.body).toEqual({ status: "ok" });
    expect(readyResponse.status).toBe(200);
    expect(readyResponse.body.database).toBe("connected");
  });

  it("serves production SPA routes from built static assets before short-code redirects", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalStaticDir = process.env.STATIC_DIR;
    const originalClientUrl = process.env.CLIENT_URL;
    const originalShortUrlBase = process.env.SHORT_URL_BASE;
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "url-shortener-dist-"));
    const indexHtml = "<!doctype html><html><body><div id=\"root\">Production app</div></body></html>";

    fs.writeFileSync(path.join(tempDir, "index.html"), indexHtml);
    process.env.NODE_ENV = "production";
    process.env.STATIC_DIR = tempDir;
    process.env.CLIENT_URL = "https://shortly.example.com";
    process.env.SHORT_URL_BASE = "https://s.example.com";

    try {
      const appModule = await import("../app.js");
      const productionApp = appModule.createApp();

      const response = await request(productionApp).get("/dashboard");

      expect(response.status).toBe(200);
      expect(response.text).toBe(indexHtml);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      if (originalStaticDir === undefined) {
        delete process.env.STATIC_DIR;
      } else {
        process.env.STATIC_DIR = originalStaticDir;
      }
      if (originalClientUrl === undefined) {
        delete process.env.CLIENT_URL;
      } else {
        process.env.CLIENT_URL = originalClientUrl;
      }
      if (originalShortUrlBase === undefined) {
        delete process.env.SHORT_URL_BASE;
      } else {
        process.env.SHORT_URL_BASE = originalShortUrlBase;
      }
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("requires an explicit client URL in production", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalClientUrl = process.env.CLIENT_URL;

    process.env.NODE_ENV = "production";
    delete process.env.CLIENT_URL;

    expect(() => getEnv()).toThrow("CLIENT_URL must include at least one URL.");

    process.env.NODE_ENV = originalNodeEnv;
    if (originalClientUrl === undefined) {
      delete process.env.CLIENT_URL;
    } else {
      process.env.CLIENT_URL = originalClientUrl;
    }
  });

  it("requires the short URL base to use https in production", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalShortUrlBase = process.env.SHORT_URL_BASE;

    process.env.NODE_ENV = "production";
    process.env.CLIENT_URL = "https://shortly.example.com";
    process.env.SHORT_URL_BASE = "http://short.ly";

    expect(() => getEnv()).toThrow("SHORT_URL_BASE must use https in production.");

    process.env.NODE_ENV = originalNodeEnv;
    if (originalShortUrlBase === undefined) {
      delete process.env.SHORT_URL_BASE;
    } else {
      process.env.SHORT_URL_BASE = originalShortUrlBase;
    }
  });

  it("updates account settings for authenticated users", async () => {
    const auth = await registerAndLogin("settings-api@example.com");

    const profileResponse = await request(app)
      .put("/api/account/me")
      .set("Authorization", `Bearer ${auth.accessToken}`)
      .send({
        name: "Settings User",
        email: "settings-updated@example.com",
      });

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.user.name).toBe("Settings User");
    expect(profileResponse.body.user.email).toBe("settings-updated@example.com");
    expect(profileResponse.body.user.accountSettings.notificationsEnabled).toBe(true);

    const passwordResponse = await request(app)
      .put("/api/account/me/password")
      .set("Authorization", `Bearer ${auth.accessToken}`)
      .send({
        currentPassword: "Password123!",
        newPassword: "NewPassword123!",
      });

    expect(passwordResponse.status).toBe(200);

    const loginResponse = await request(app).post("/api/auth/login").send({
      email: "settings-updated@example.com",
      password: "NewPassword123!",
    });

    expect(loginResponse.status).toBe(200);

    const oldPasswordResponse = await request(app).post("/api/auth/login").send({
      email: "settings-updated@example.com",
      password: "Password123!",
    });

    expect(oldPasswordResponse.status).toBe(401);

    const settingsResponse = await request(app)
      .put("/api/account/me/settings")
      .set("Authorization", `Bearer ${auth.accessToken}`)
      .send({
        notificationsEnabled: false,
      });

    expect(settingsResponse.status).toBe(200);
    expect(settingsResponse.body.user.accountSettings.notificationsEnabled).toBe(false);
  });

  it("deletes account data and revokes refresh tokens for authenticated users", async () => {
    const agent = request.agent(app);
    const registerResponse = await agent.post("/api/auth/register").send({
      name: "Delete User",
      email: "delete-account@example.com",
      password: "Password123!",
    });

    expect(registerResponse.status).toBe(201);

    const createResponse = await agent
      .post("/api/urls")
      .set("Authorization", `Bearer ${registerResponse.body.accessToken}`)
      .send({
        originalUrl: "https://example.com/delete-me",
        customAlias: "deleteme",
      });

    expect(createResponse.status).toBe(201);

    await Click.create({
      url: createResponse.body.url.id,
      browser: "Chrome",
      device: "Desktop",
      country: "Kenya",
      city: "Nairobi",
      clickedAt: new Date(),
    });

    const deleteResponse = await agent.delete("/api/account/me").set("Authorization", `Bearer ${registerResponse.body.accessToken}`);

    expect(deleteResponse.status).toBe(204);
    expect(deleteResponse.headers["set-cookie"]?.join(";")).toContain("refreshToken=;");
    await expect(User.findOne({ email: "delete-account@example.com" })).resolves.toBeNull();
    await expect(URLModel.findById(createResponse.body.url.id)).resolves.toBeNull();
    await expect(Click.find({ url: createResponse.body.url.id })).resolves.toHaveLength(0);
    await expect(RefreshToken.find({ user: registerResponse.body.user.id })).resolves.toHaveLength(0);

    const refreshResponse = await agent.post("/api/auth/refresh").send();

    expect(refreshResponse.status).toBe(400);
    expect(refreshResponse.body.error.message).toBe("refreshToken is required.");
  });

  it("returns dashboard analytics for the authenticated user", async () => {
    const auth = await registerAndLogin("dashboard-analytics@example.com");
    const createResponse = await request(app)
      .post("/api/urls")
      .set("Authorization", `Bearer ${auth.accessToken}`)
      .send({
        originalUrl: "https://example.com/dashboard",
        customAlias: "dash1",
      });

    expect(createResponse.status).toBe(201);
    await Click.create({
      url: createResponse.body.url.id,
      browser: "Chrome",
      device: "Mobile",
      country: "Kenya",
      city: "Nairobi",
      clickedAt: new Date(),
    });
    await URLModel.updateOne({ _id: createResponse.body.url.id }, { clickCount: 1 });

    const dashboardResponse = await request(app).get("/api/analytics").set("Authorization", `Bearer ${auth.accessToken}`);

    expect(dashboardResponse.status).toBe(200);
    expect(dashboardResponse.body.analytics.summary[0].value).toBe("1");
    expect(dashboardResponse.body.analytics.links[0].shortUrl).toContain("/dash1");
    expect(dashboardResponse.body.analytics.devices).toContainEqual({ name: "Mobile", value: 100 });
    expect(dashboardResponse.body.analytics.browsers).toContainEqual({
      name: "Chrome",
      clicks: 1,
      share: 100,
    });
    expect(dashboardResponse.body.analytics.locations).toContainEqual({
      place: "Nairobi",
      country: "Kenya",
      clicks: 1,
      share: 100,
    });
  });
});
