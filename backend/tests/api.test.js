import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { connectDatabase, disconnectDatabase } from "../config/database.js";
import Click from "../models/Click.js";
import RefreshToken from "../models/RefreshToken.js";
import URLModel from "../models/URL.js";
import User from "../models/User.js";

let app;
let mongoServer;

async function syncModelIndexes() {
  await Promise.all([User.syncIndexes(), URLModel.syncIndexes(), Click.syncIndexes(), RefreshToken.syncIndexes()]);
}

async function registerAndLogin(email = "api@example.com") {
  const response = await request(app).post("/api/auth/register").send({
    name: "API User",
    email,
    password: "Password123",
  });

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
    await Promise.all([Click.deleteMany({}), URLModel.deleteMany({}), RefreshToken.deleteMany({}), User.deleteMany({})]);
  });

  afterAll(async () => {
    await disconnectDatabase();
    await mongoServer?.stop();
  });

  it("registers users and stores a hashed refresh token", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "New User",
      email: "new@example.com",
      password: "Password123",
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

  it("logs in users with valid credentials", async () => {
    await User.create({
      name: "Login User",
      email: "login@example.com",
      password: "Password123",
    });

    const response = await request(app).post("/api/auth/login").send({
      email: "login@example.com",
      password: "Password123",
    });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe("login@example.com");
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toBeUndefined();
  });

  it("rotates refresh tokens and rejects reuse", async () => {
    const agent = request.agent(app);

    const registerResponse = await agent.post("/api/auth/register").send({
      name: "Refresh User",
      email: "refresh@example.com",
      password: "Password123",
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
});
