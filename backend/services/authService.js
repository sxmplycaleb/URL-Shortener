import crypto from "node:crypto";

import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { getEnv } from "../config/env.js";
import { hashToken } from "../utils/hash.js";
import { issueTokenPair, revokeRefreshToken, rotateRefreshToken } from "./tokenService.js";
import RefreshToken from "../models/RefreshToken.js";
import { verifyGoogleIdToken } from "./firebaseAdmin.js";
import OTP from "../models/OTP.js";
import LoginHistory from "../models/LoginHistory.js";
import TrustedDevice from "../models/TrustedDevice.js";
import { BrevoEmailProvider } from "./otpProviders.js";
import { normalizePhoneNumber } from "../utils/phone.js";
import { trustedDeviceFingerprint } from "./securityMetadata.js";

const PASSWORD_RESET_TOKEN_BYTES = 32;
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const GOOGLE_NAME_FALLBACK = "Google User";

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    emailVerified: user.emailVerified,
    provider: user.provider,
    avatar: user.avatar,
    lastLogin: user.lastLogin,
    authProviders: {
      email: user.provider === "email" || Boolean(user.password),
      google: Boolean(user.googleId),
      googleLinkedAt: user.googleLinkedAt,
      phone: Boolean(user.phone),
    },
    phone: user.phone,
    phoneVerified: user.phoneVerified,
    accountSettings: {
      notificationsEnabled: user.accountSettings?.notificationsEnabled ?? true,
      emailOtpEnabled: user.accountSettings?.emailOtpEnabled ?? true,
      smsOtpEnabled: user.accountSettings?.smsOtpEnabled ?? false,
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function normalizeGoogleName(name, email) {
  const trimmedName = typeof name === "string" ? name.trim() : "";

  if (trimmedName.length >= 2) {
    return trimmedName.slice(0, 80);
  }

  const emailName = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  return emailName && emailName.length >= 2 ? emailName.slice(0, 80) : GOOGLE_NAME_FALLBACK;
}

function googleTokenErrorMessage(error) {
  const code = error?.code;

  if (code === "auth/id-token-expired") {
    return "Google sign-in expired. Please try again.";
  }

  if (code === "auth/id-token-revoked") {
    return "Google sign-in was revoked. Please sign in again.";
  }

  return "Google sign-in could not be verified. Please try again.";
}

async function recordLoginAttempt({ user, email, status, method, metadata = {} }) {
  await LoginHistory.create({
    user: user?._id,
    email,
    status,
    method,
    device: metadata.device,
    ipAddress: metadata.ipAddress,
    browser: metadata.browser,
    operatingSystem: metadata.operatingSystem,
  });
}

async function rememberTrustedDevice(user, metadata = {}) {
  if (!user) return;

  const { rememberDeviceDurationMs } = getEnv();
  const fingerprintHash = trustedDeviceFingerprint(metadata);
  await TrustedDevice.findOneAndUpdate(
    { user: user._id, fingerprintHash },
    {
      user: user._id,
      fingerprintHash,
      device: metadata.device,
      browser: metadata.browser,
      operatingSystem: metadata.operatingSystem,
      ipAddress: metadata.ipAddress,
      lastUsedAt: new Date(),
      expiresAt: new Date(Date.now() + rememberDeviceDurationMs),
    },
    { upsert: true, setDefaultsOnInsert: true },
  );
}

export async function registerUser({ name, email, password, phone }, metadata = {}) {
  try {
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedPhone = normalizePhoneNumber(phone);
    const verifiedRegistrationOtp = await OTP.findOne({
      email: normalizedEmail,
      purpose: "REGISTER",
      used: true,
      verifiedAt: { $ne: null },
      expiresAt: { $gt: new Date() },
    });
    const verifiedPhoneRegistrationOtp = normalizedPhone
      ? await OTP.findOne({
          phone: normalizedPhone,
          purpose: "REGISTER",
          used: true,
          verifiedAt: { $ne: null },
          expiresAt: { $gt: new Date() },
        })
      : null;

    if (normalizedPhone && !verifiedPhoneRegistrationOtp) {
      throw new AppError("Phone number must be verified before registration.", 400);
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      phone: normalizedPhone ?? undefined,
      phoneVerified: Boolean(verifiedPhoneRegistrationOtp),
      emailVerified: Boolean(verifiedRegistrationOtp),
      isVerified: Boolean(verifiedRegistrationOtp || verifiedPhoneRegistrationOtp),
    });
    await recordLoginAttempt({ user, email: normalizedEmail, status: "success", method: "email_password", metadata });
    const tokens = await issueTokenPair(user, metadata);

    return {
      user: publicUser(user),
      ...tokens,
    };
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError("An account with that email or phone number already exists.", 409);
    }

    throw error;
  }
}

export async function loginUser({ email, password, rememberDevice = false }, metadata = {}) {
  const normalizedEmail = email?.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    await recordLoginAttempt({ user, email: normalizedEmail, status: "failed", method: "email_password", metadata });
    throw new AppError("Invalid email or password.", 401);
  }

  user.lastLogin = new Date();
  await user.save({ validateModifiedOnly: true });
  if (rememberDevice) {
    await rememberTrustedDevice(user, metadata);
  }
  await recordLoginAttempt({ user, email: normalizedEmail, status: "success", method: "email_password", metadata });
  const tokens = await issueTokenPair(user, metadata);

  return {
    user: publicUser(user),
    ...tokens,
  };
}

export async function loginWithGoogle({ idToken, rememberDevice = false }, metadata = {}) {
  let decodedToken;

  try {
    decodedToken = await verifyGoogleIdToken(idToken);
  } catch (error) {
    throw new AppError(googleTokenErrorMessage(error), 401);
  }

  const googleId = decodedToken.uid ?? decodedToken.sub;
  const email = typeof decodedToken.email === "string" ? decodedToken.email.trim().toLowerCase() : "";
  const emailVerified = decodedToken.email_verified === true;

  if (!googleId || !email) {
    throw new AppError("Google sign-in response was incomplete. Please try again.", 401);
  }

  if (!emailVerified) {
    await recordLoginAttempt({ email, status: "failed", method: "google", metadata });
    throw new AppError("Your Google email must be verified before you can sign in.", 403);
  }

  const existingGoogleUser = await User.findOne({ googleId }).select("+password");
  const existingEmailUser = await User.findOne({ email }).select("+password");

  if (existingGoogleUser && existingEmailUser && !existingGoogleUser._id.equals(existingEmailUser._id)) {
    throw new AppError("This Google account is already linked to another user.", 409);
  }

  const now = new Date();
  const googleProfile = {
    googleId,
    avatar: typeof decodedToken.picture === "string" ? decodedToken.picture : undefined,
    emailVerified,
    isVerified: emailVerified,
    lastLogin: now,
  };
  let user = existingGoogleUser ?? existingEmailUser;

  if (user) {
    if (!user.googleId) {
      user.googleId = googleId;
      user.googleLinkedAt = now;
    }

    user.avatar = googleProfile.avatar ?? user.avatar;
    user.emailVerified = emailVerified;
    user.isVerified = user.isVerified || emailVerified;
    user.lastLogin = now;
    await user.save({ validateModifiedOnly: true });
  } else {
    try {
      user = await User.create({
        name: normalizeGoogleName(decodedToken.name, email),
        email,
        provider: "google",
        googleLinkedAt: now,
        ...googleProfile,
      });
    } catch (error) {
      if (error.code === 11000) {
        throw new AppError("An account with this Google identity already exists.", 409);
      }

      throw error;
    }
  }

  if (rememberDevice) {
    await rememberTrustedDevice(user, metadata);
  }
  await recordLoginAttempt({ user, email, status: "success", method: "google", metadata });
  const tokens = await issueTokenPair(user, metadata);

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

function createEmailProvider() {
  const config = getEnv();

  return new BrevoEmailProvider({
    apiKey: config.brevoApiKey,
    senderName: config.brevoSenderName,
    senderEmail: config.brevoSenderEmail,
  });
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

  const resetUrl = buildPasswordResetUrl(token);
  await createEmailProvider().sendPasswordResetLink({ email: user.email, resetUrl });

  if (getEnv().nodeEnv !== "production") {
    response.resetUrl = resetUrl;
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

export async function loginUserWithOtp({ email, rememberDevice = false }, metadata = {}) {
  const user = await User.findOne({ email: email?.trim().toLowerCase() });

  if (!user) {
    await recordLoginAttempt({ email: email?.trim().toLowerCase(), status: "failed", method: "email_otp", metadata });
    throw new AppError("No account exists for that email address.", 404);
  }

  user.lastLogin = new Date();
  await user.save({ validateModifiedOnly: true });

  if (rememberDevice) {
    await rememberTrustedDevice(user, metadata);
  }
  await recordLoginAttempt({ user, email: user.email, status: "success", method: "email_otp", metadata });
  const tokens = await issueTokenPair(user, metadata);

  return {
    user: publicUser(user),
    ...tokens,
  };
}

export async function loginUserWithPhoneOtp({ phone, rememberDevice = false }, metadata = {}) {
  const normalizedPhone = normalizePhoneNumber(phone);
  const user = await User.findOne({ phone: normalizedPhone });

  if (!user) {
    await recordLoginAttempt({ status: "failed", method: "sms_otp", metadata });
    throw new AppError("No account exists for that phone number.", 404);
  }

  user.lastLogin = new Date();
  await user.save({ validateModifiedOnly: true });

  if (rememberDevice) {
    await rememberTrustedDevice(user, metadata);
  }
  await recordLoginAttempt({ user, email: user.email, status: "success", method: "sms_otp", metadata });
  const tokens = await issueTokenPair(user, metadata);

  return {
    user: publicUser(user),
    ...tokens,
  };
}

export async function createPasswordResetFromOtp({ email }) {
  const user = await User.findOne({ email: email?.trim().toLowerCase() }).select(
    "+passwordResetTokenHash +passwordResetExpiresAt",
  );

  if (!user) {
    throw new AppError("No account exists for that email address.", 404);
  }

  const token = crypto.randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("hex");
  user.passwordResetTokenHash = hashToken(token);
  user.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
  await user.save({ validateModifiedOnly: true });

  return {
    message: "Verification complete. Choose a new password to finish resetting your account.",
    resetUrl: buildPasswordResetUrl(token),
  };
}

export async function createPasswordResetFromPhoneOtp({ phone }) {
  const normalizedPhone = normalizePhoneNumber(phone);
  const user = await User.findOne({ phone: normalizedPhone }).select(
    "+passwordResetTokenHash +passwordResetExpiresAt",
  );

  if (!user) {
    throw new AppError("No account exists for that phone number.", 404);
  }

  const token = crypto.randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("hex");
  user.passwordResetTokenHash = hashToken(token);
  user.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
  await user.save({ validateModifiedOnly: true });

  return {
    message: "Verification complete. Choose a new password to finish resetting your account.",
    resetUrl: buildPasswordResetUrl(token),
  };
}

export async function refreshAuth(refreshToken, metadata = {}) {
  const payload = await rotateRefreshToken(refreshToken, metadata);

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
