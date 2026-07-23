import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { hashToken } from "../utils/hash.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import Click from "../models/Click.js";
import RefreshToken from "../models/RefreshToken.js";
import URLModel from "../models/URL.js";
import User from "../models/User.js";

let mongoServer;

async function syncModelIndexes() {
  await Promise.all([User.syncIndexes(), URLModel.syncIndexes(), Click.syncIndexes(), RefreshToken.syncIndexes()]);
}

describe("database models", () => {
  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.HASH_SALT = "test-salt";
    mongoServer = await MongoMemoryServer.create();
    await connectDatabase({
      uri: mongoServer.getUri(),
      maxRetries: 1,
      mongooseOptions: { dbName: "url-shortener-test" },
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

  it("creates a user, hashes passwords, validates email, and compares passwords", async () => {
    const user = await User.create({
      name: "Test User",
      email: "TEST@Example.com",
      password: "Password123!",
    });

    expect(user.email).toBe("test@example.com");
    expect(user.password).not.toBe("Password123!");
    await expect(user.comparePassword("Password123!")).resolves.toBe(true);
    await expect(user.comparePassword("WrongPass123")).resolves.toBe(false);

    await expect(
      User.create({
        name: "Invalid User",
        email: "not-an-email",
        password: "Password123!",
      }),
    ).rejects.toThrow(/valid email/);

    await expect(
      User.create({
        name: "Weak User",
        email: "weak@example.com",
        password: "password",
      }),
    ).rejects.toThrow(/uppercase, lowercase, number, and special characters/);
  });

  it("supports Google-only users without passwords and enforces unique Google IDs", async () => {
    const user = await User.create({
      name: "Google User",
      email: "google-model@example.com",
      provider: "google",
      googleId: "google-model-id",
      avatar: "https://lh3.googleusercontent.com/model.png",
      emailVerified: true,
      isVerified: true,
      googleLinkedAt: new Date(),
      lastLogin: new Date(),
    });

    expect(user.provider).toBe("google");
    expect(user.password).toBeUndefined();
    expect(user.googleId).toBe("google-model-id");
    expect(user.emailVerified).toBe(true);

    await expect(
      User.create({
        name: "Duplicate Google",
        email: "google-model-duplicate@example.com",
        provider: "google",
        googleId: "google-model-id",
      }),
    ).rejects.toMatchObject({ code: 11000 });
  });

  it("requires passwords for email users", async () => {
    await expect(
      User.create({
        name: "Passwordless Email",
        email: "passwordless@example.com",
      }),
    ).rejects.toThrow(/Password is required/);
  });

  it("enforces unique user emails and unique URL codes", async () => {
    const user = await User.create({
      name: "Unique User",
      email: "unique@example.com",
      password: "Password123!",
    });

    await expect(
      User.create({
        name: "Duplicate User",
        email: "unique@example.com",
        password: "Password123!",
      }),
    ).rejects.toMatchObject({ code: 11000 });

    await URLModel.create({
      originalUrl: "https://example.com/first",
      shortCode: "samecode",
      user: user._id,
    });

    await expect(
      URLModel.create({
        originalUrl: "https://example.com/second",
        shortCode: "samecode",
        user: user._id,
      }),
    ).rejects.toMatchObject({ code: 11000 });
  });

  it("creates URL documents with generated codes, validation, relationships, and utility methods", async () => {
    const user = await User.create({
      name: "URL Owner",
      email: "owner@example.com",
      password: "Password123!",
    });

    const url = await URLModel.create({
      originalUrl: "https://example.com/articles/mongoose",
      user: user._id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    expect(url.shortCode).toMatch(/^[A-Za-z0-9_-]{7}$/);
    expect(url.isExpired()).toBe(false);
    await url.incrementClicks();
    expect(url.clickCount).toBe(1);

    const populated = await URLModel.findById(url._id).populate("user");
    expect(populated.user.email).toBe("owner@example.com");

    await expect(
      URLModel.create({
        originalUrl: "ftp://example.com/file",
        shortCode: "badurl1",
        user: user._id,
      }),
    ).rejects.toThrow(/http or https URL/);

    await expect(
      URLModel.create({
        originalUrl: "https://example.com",
        shortCode: "bad code",
        user: user._id,
      }),
    ).rejects.toThrow(/letters, numbers, underscores, and hyphens/);
  });

  it("stores hashed click analytics and supports URL-to-click relationships", async () => {
    const user = await User.create({
      name: "Analytics User",
      email: "analytics@example.com",
      password: "Password123!",
    });
    const url = await URLModel.create({
      originalUrl: "https://example.com/analytics",
      shortCode: "stats01",
      user: user._id,
    });

    const click = await Click.create({
      url: url._id,
      visitorIp: "203.0.113.1",
      browser: "Chrome",
      operatingSystem: "Windows",
      device: "Desktop",
      country: "United States",
      city: "Austin",
      referrer: "https://google.com",
    });

    expect(click.ipHash).toHaveLength(64);
    expect(click.ipHash).not.toBe("203.0.113.1");

    const clicks = await Click.find({ url: url._id });
    expect(clicks).toHaveLength(1);
  });

  it("hashes refresh tokens, revokes them, and exposes token utility methods", async () => {
    const user = await User.create({
      name: "Token User",
      email: "token@example.com",
      password: "Password123!",
    });

    const token = await RefreshToken.create({
      user: user._id,
      tokenHash: "plain-refresh-token",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    expect(token.tokenHash).toHaveLength(64);
    expect(token.isExpired()).toBe(false);
    await token.revoke();
    expect(token.revoked).toBe(true);

    const alreadyHashedToken = hashToken("already-hashed-refresh-token");
    const storedHashedToken = await RefreshToken.create({
      user: user._id,
      tokenHash: alreadyHashedToken,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    expect(storedHashedToken.tokenHash).toBe(alreadyHashedToken);
  });

  it("creates expected indexes for performance and TTL cleanup", async () => {
    const userIndexes = await User.collection.indexes();
    const urlIndexes = await URLModel.collection.indexes();
    const clickIndexes = await Click.collection.indexes();
    const tokenIndexes = await RefreshToken.collection.indexes();

    expect(userIndexes.some((index) => index.key.email === 1 && index.unique)).toBe(true);
    expect(urlIndexes.some((index) => index.key.shortCode === 1 && index.unique)).toBe(true);
    expect(urlIndexes.some((index) => index.key.customAlias === 1 && index.unique && index.sparse)).toBe(true);
    expect(urlIndexes.some((index) => index.key.expiresAt === 1 && index.expireAfterSeconds === 0)).toBe(true);
    expect(clickIndexes.some((index) => index.key.url === 1 && index.key.clickedAt === -1)).toBe(true);
    expect(tokenIndexes.some((index) => index.key.expiresAt === 1 && index.expireAfterSeconds === 0)).toBe(true);
  });

  it("supports basic CRUD operations", async () => {
    const user = await User.create({
      name: "CRUD User",
      email: "crud@example.com",
      password: "Password123!",
    });

    const created = await URLModel.create({
      originalUrl: "https://example.com/crud",
      shortCode: "crud01",
      user: user._id,
    });
    const found = await URLModel.findOne({ shortCode: "crud01" });

    expect(found.originalUrl).toBe(created.originalUrl);

    await URLModel.updateOne({ _id: created._id }, { isActive: false });
    const updated = await URLModel.findById(created._id);
    expect(updated.isActive).toBe(false);

    await URLModel.deleteOne({ _id: created._id });
    await expect(URLModel.findById(created._id)).resolves.toBeNull();
    expect(mongoose.connection.readyState).toBe(1);
  });
});
