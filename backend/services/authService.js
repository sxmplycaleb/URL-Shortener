import crypto from "node:crypto";

import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { getEnv } from "../config/env.js";
import { hashToken } from "../utils/hash.js";
import { issueTokenPair, revokeRefreshToken, rotateRefreshToken } from "./tokenService.js";
import RefreshToken from "../models/RefreshToken.js";

const PASSWORD_RESET_TOKEN_BYTES = 32;
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    accountSettings: {
      notificationsEnabled: user.accountSettings?.notificationsEnabled ?? true,
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function registerUser({ name, email, password }) {
  try {
    const user = await User.create({ name, email, password });
    const tokens = await issueTokenPair(user);

    return {
      user: publicUser(user),
      ...tokens,
    };
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError("An account with that email already exists.", 409);
    }

    throw error;
  }
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email: email?.trim().toLowerCase() }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Invalid email or password.", 401);
  }

  const tokens = await issueTokenPair(user);

  return {
    user: publicUser(user),
    ...tokens,
  };
}

function buildPasswordResetUrl(token) {
  const { clientUrl } = getEnv();
  const url = new URL("/reset-password", clientUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function requestPasswordReset({ email }) {
  const user = await User.findOne({ email: email?.trim().toLowerCase() }).select(
    "+passwordResetTokenHash +passwordResetExpiresAt",
  );
  const response = {
    message: "If an account exists for that email, a password reset link has been prepared.",
  };

  if (!user) {
    return response;
  }

  const token = crypto.randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("hex");
  user.passwordResetTokenHash = hashToken(token);
  user.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
  await user.save({ validateModifiedOnly: true });

  if (getEnv().nodeEnv !== "production") {
    response.resetUrl = buildPasswordResetUrl(token);
  }

  return response;
}

export async function resetPassword({ token, password }) {
  const tokenHash = hashToken(token);
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: { $gt: new Date() },
  }).select("+password +passwordResetTokenHash +passwordResetExpiresAt");

  if (!user) {
    throw new AppError("Password reset link is invalid or expired.", 400);
  }

  user.password = password;
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();
  await RefreshToken.deleteMany({ user: user._id });

  return {
    message: "Your password has been reset. You can now log in with the new password.",
  };
}

export async function refreshAuth(refreshToken) {
  const payload = await rotateRefreshToken(refreshToken);

  return {
    user: publicUser(payload.user),
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  };
}

export function logoutUser(refreshToken) {
  return revokeRefreshToken(refreshToken);
}

export function publicUserResource(user) {
  return publicUser(user);
}
