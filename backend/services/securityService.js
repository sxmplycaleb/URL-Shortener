import mongoose from "mongoose";

import LoginHistory from "../models/LoginHistory.js";
import RefreshToken from "../models/RefreshToken.js";
import TrustedDevice from "../models/TrustedDevice.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { findRefreshTokenRecord } from "./tokenService.js";
import { publicUserResource } from "./authService.js";

function publicSession(token, currentTokenId) {
  return {
    id: token._id.toString(),
    browser: token.browser ?? "Unknown",
    device: token.device ?? "Unknown",
    operatingSystem: token.operatingSystem ?? "Unknown",
    ipAddress: token.ipAddress ?? "Unknown",
    country: token.country ?? null,
    lastActiveAt: token.lastActiveAt ?? token.updatedAt,
    createdAt: token.createdAt,
    current: currentTokenId ? token._id.equals(currentTokenId) : false,
  };
}

function publicLoginHistory(entry) {
  return {
    id: entry._id.toString(),
    status: entry.status,
    method: entry.method,
    device: entry.device ?? "Unknown",
    ipAddress: entry.ipAddress ?? "Unknown",
    browser: entry.browser ?? "Unknown",
    operatingSystem: entry.operatingSystem ?? "Unknown",
    timestamp: entry.createdAt,
  };
}

function publicTrustedDevice(device) {
  return {
    id: device._id.toString(),
    device: device.device ?? "Unknown",
    browser: device.browser ?? "Unknown",
    operatingSystem: device.operatingSystem ?? "Unknown",
    ipAddress: device.ipAddress ?? "Unknown",
    lastUsedAt: device.lastUsedAt,
    expiresAt: device.expiresAt,
  };
}

function sameUserId(left, right) {
  return left?.toString() === right?.toString();
}

async function requireCurrentSession(userId, refreshToken) {
  const currentSession = await findRefreshTokenRecord(refreshToken);

  if (!currentSession || !sameUserId(currentSession.user, userId)) {
    throw new AppError("Current session could not be verified.", 401);
  }

  return currentSession;
}

export async function getSecurityCenter(userId, refreshToken) {
  const [possibleCurrentSession, sessions, loginHistory, trustedDevices, user] = await Promise.all([
    findRefreshTokenRecord(refreshToken),
    RefreshToken.find({
      user: userId,
      revoked: false,
      expiresAt: { $gt: new Date() },
    }).sort({ lastActiveAt: -1, createdAt: -1 }),
    LoginHistory.find({ user: userId }).sort({ createdAt: -1 }).limit(50),
    TrustedDevice.find({ user: userId, expiresAt: { $gt: new Date() } }).sort({ lastUsedAt: -1 }),
    User.findById(userId),
  ]);

  if (!user) {
    throw new AppError("Authenticated user no longer exists.", 401);
  }

  const currentSession = sameUserId(possibleCurrentSession?.user, userId) ? possibleCurrentSession : null;

  return {
    sessions: sessions.map((session) => publicSession(session, currentSession?._id)),
    loginHistory: loginHistory.map(publicLoginHistory),
    trustedDevices: trustedDevices.map(publicTrustedDevice),
    securitySettings: {
      emailOtpEnabled: user.accountSettings?.emailOtpEnabled ?? true,
      smsOtpEnabled: user.accountSettings?.smsOtpEnabled ?? false,
      googleLinked: Boolean(user.googleId),
      googleLinkedAt: user.googleLinkedAt ?? null,
      hasPassword: Boolean(user.password || user.provider === "email"),
      phoneVerified: Boolean(user.phoneVerified),
    },
  };
}

export async function revokeSession(userId, sessionId, { refreshToken, confirmCurrent = false } = {}) {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new AppError("sessionId is invalid.", 400);
  }

  const currentSession = await requireCurrentSession(userId, refreshToken);
  const revokingCurrent = currentSession?._id.equals(sessionId);

  if (revokingCurrent && !confirmCurrent) {
    throw new AppError("Confirm before revoking the current session.", 409);
  }

  const result = await RefreshToken.updateOne(
    {
      _id: sessionId,
      user: userId,
      revoked: false,
    },
    { revoked: true },
  );

  if (result.matchedCount === 0) {
    throw new AppError("Session was not found.", 404);
  }

  return { revokedCurrent: Boolean(revokingCurrent) };
}

export async function revokeOtherSessions(userId, refreshToken) {
  const currentSession = await requireCurrentSession(userId, refreshToken);
  const query = {
    user: userId,
    revoked: false,
    expiresAt: { $gt: new Date() },
  };

  if (currentSession?._id) {
    query._id = { $ne: currentSession._id };
  }

  const result = await RefreshToken.updateMany(query, { revoked: true });
  return { revokedCount: result.modifiedCount };
}

export async function removeTrustedDevice(userId, deviceId) {
  if (!mongoose.Types.ObjectId.isValid(deviceId)) {
    throw new AppError("deviceId is invalid.", 400);
  }

  const result = await TrustedDevice.deleteOne({
    _id: deviceId,
    user: userId,
  });

  if (result.deletedCount === 0) {
    throw new AppError("Trusted device was not found.", 404);
  }
}

export async function updateSecuritySettings(userId, { emailOtpEnabled, smsOtpEnabled }) {
  const user = await User.findByIdAndUpdate(
    userId,
    {
      "accountSettings.emailOtpEnabled": emailOtpEnabled,
      "accountSettings.smsOtpEnabled": smsOtpEnabled,
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  );

  if (!user) {
    throw new AppError("Authenticated user no longer exists.", 401);
  }

  return publicUserResource(user);
}
