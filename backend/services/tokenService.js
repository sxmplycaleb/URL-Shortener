import crypto from "node:crypto";

import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import { getEnv } from "../config/env.js";
import RefreshToken from "../models/RefreshToken.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";

function createRefreshTokenValue() {
  return crypto.randomBytes(48).toString("base64url");
}

function refreshTokenExpiryDate() {
  const { refreshTokenTtlDays } = getEnv();
  return new Date(Date.now() + refreshTokenTtlDays * 24 * 60 * 60 * 1000);
}

export function signAccessToken(user) {
  const { accessTokenSecret, accessTokenExpiresIn } = getEnv();

  return jwt.sign({ sub: user._id.toString(), role: user.role }, accessTokenSecret, {
    algorithm: "HS256",
    expiresIn: accessTokenExpiresIn,
  });
}

export function signRefreshToken(tokenValue, user) {
  const { refreshTokenSecret, refreshTokenExpiresIn } = getEnv();

  return jwt.sign({ sub: user._id.toString(), token: tokenValue }, refreshTokenSecret, {
    algorithm: "HS256",
    expiresIn: refreshTokenExpiresIn,
  });
}

export async function issueTokenPair(user) {
  const refreshTokenValue = createRefreshTokenValue();

  await RefreshToken.create({
    user: user._id,
    tokenHash: refreshTokenValue,
    expiresAt: refreshTokenExpiryDate(),
  });

  return {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(refreshTokenValue, user),
  };
}

export function verifyAccessToken(token) {
  const { accessTokenSecret } = getEnv();
  return jwt.verify(token, accessTokenSecret, { algorithms: ["HS256"] });
}

export async function rotateRefreshToken(refreshToken) {
  const { refreshTokenSecret } = getEnv();

  let payload;

  try {
    payload = jwt.verify(refreshToken, refreshTokenSecret, { algorithms: ["HS256"] });
  } catch {
    throw new AppError("Invalid refresh token.", 401);
  }

  if (
    typeof payload?.sub !== "string" ||
    typeof payload?.token !== "string" ||
    !mongoose.Types.ObjectId.isValid(payload.sub)
  ) {
    throw new AppError("Invalid refresh token.", 401);
  }

  const tokenHash = RefreshToken.hashToken(payload.token);
  const storedToken = await RefreshToken.findOneAndUpdate(
    {
      tokenHash,
      user: payload.sub,
      revoked: false,
      expiresAt: { $gt: new Date() },
    },
    { revoked: true },
  );

  if (!storedToken) {
    throw new AppError("Invalid refresh token.", 401);
  }

  await storedToken.populate("user");

  return {
    user: storedToken.user,
    ...(await issueTokenPair(storedToken.user)),
  };
}

export async function revokeRefreshToken(refreshToken) {
  if (!refreshToken) {
    return;
  }

  const { refreshTokenSecret } = getEnv();

  try {
    const payload = jwt.verify(refreshToken, refreshTokenSecret, { algorithms: ["HS256"] });

    if (typeof payload?.token !== "string") {
      return;
    }

    const tokenHash = RefreshToken.hashToken(payload.token);
    await RefreshToken.updateOne({ tokenHash }, { revoked: true });
  } catch {
    // Logout remains idempotent when a token is malformed or already expired.
  }
}

export async function findUserFromAccessToken(token) {
  let payload;

  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AppError("Invalid or expired access token.", 401);
  }

  if (typeof payload?.sub !== "string" || !mongoose.Types.ObjectId.isValid(payload.sub)) {
    throw new AppError("Invalid or expired access token.", 401);
  }

  const user = await User.findById(payload.sub);

  if (!user) {
    throw new AppError("Authenticated user no longer exists.", 401);
  }

  return user;
}
