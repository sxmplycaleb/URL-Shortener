import crypto from "node:crypto";

import { getEnv } from "../config/env.js";
import OTP, { OTP_PURPOSES } from "../models/OTP.js";
import AppError from "../utils/AppError.js";
import { hashToken } from "../utils/hash.js";
import { logger } from "../utils/logger.js";
import { ResendEmailProvider, TwilioVerifyProvider } from "./otpProviders.js";

const OTP_DIGITS = 6;
const MAX_OTP_ATTEMPTS = 5;
const VALID_CHANNELS = new Set(["email", "sms", "whatsapp"]);

function normalizeEmail(email) {
  return typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;
}

function normalizePhone(phone) {
  return typeof phone === "string" && phone.trim() ? phone.trim() : null;
}

function hashOtp({ otp, purpose, email, phone }) {
  return hashToken(`${purpose}:${email ?? ""}:${phone ?? ""}:${otp}`);
}

function otpSelector({ userId, email, phone, purpose, used }) {
  const selector = { purpose };

  if (used !== undefined) {
    selector.used = used;
  }

  if (userId) {
    selector.userId = userId;
  }

  if (email) {
    selector.email = email;
  }

  if (phone) {
    selector.phone = phone;
  }

  return selector;
}

class SlidingWindowLimiter {
  constructor({ max, windowMs, now = () => new Date() }) {
    this.max = max;
    this.windowMs = windowMs;
    this.now = now;
    this.events = new Map();
  }

  consume(key) {
    const timestamp = this.now().getTime();
    const cutoff = timestamp - this.windowMs;
    const recentEvents = (this.events.get(key) ?? []).filter((eventTime) => eventTime > cutoff);

    if (recentEvents.length >= this.max) {
      return false;
    }

    recentEvents.push(timestamp);
    this.events.set(key, recentEvents);
    return true;
  }
}

export class AuthenticationService {
  constructor({
    otpModel = OTP,
    emailProvider,
    phoneProvider,
    auditLogger = logger,
    now = () => new Date(),
    generateOtp = () => crypto.randomInt(0, 10 ** OTP_DIGITS).toString().padStart(OTP_DIGITS, "0"),
    config = getEnv(),
  } = {}) {
    this.otpModel = otpModel;
    this.emailProvider = emailProvider;
    this.phoneProvider = phoneProvider;
    this.auditLogger = auditLogger;
    this.now = now;
    this.generateOtp = generateOtp;
    this.config = config;
    this.verificationLimiter = new SlidingWindowLimiter({
      max: config.otpVerificationRateLimitMax,
      windowMs: config.otpVerificationRateLimitWindowMs,
      now,
    });
  }

  assertPurpose(purpose) {
    if (!OTP_PURPOSES.includes(purpose)) {
      throw new AppError("OTP purpose is invalid.", 400);
    }
  }

  normalizeTarget({ email, phone }) {
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedEmail && !normalizedPhone) {
      throw new AppError("An email or phone number is required for OTP authentication.", 400);
    }

    return { email: normalizedEmail, phone: normalizedPhone };
  }

  async assertGenerationRateLimit({ userId, email, phone, purpose }) {
    const since = new Date(this.now().getTime() - this.config.otpGenerationRateLimitWindowMs);
    const selector = otpSelector({ userId, email, phone, purpose });

    if (this.config.otpResendCooldownMs > 0) {
      const cooldownSince = new Date(this.now().getTime() - this.config.otpResendCooldownMs);
      const recentOtp = await this.otpModel.exists({
        ...selector,
        createdAt: { $gte: cooldownSince },
      });

      if (recentOtp) {
        this.auditLogger.warn("auth.otp.request_cooldown", { userId, email, phone, purpose });
        throw new AppError("Please wait before requesting another verification code.", 429);
      }
    }

    const count = await this.otpModel.countDocuments({
      ...selector,
      createdAt: { $gte: since },
    });

    if (count >= this.config.otpGenerationRateLimitMax) {
      this.auditLogger.warn("auth.otp.request_rate_limited", { userId, email, phone, purpose });
      throw new AppError("Too many verification code requests. Please try again later.", 429);
    }
  }

  assertVerificationRateLimit({ email, phone, purpose }) {
    const target = email ?? phone;
    const allowed = this.verificationLimiter.consume(`${purpose}:${target}`);

    if (!allowed) {
      this.auditLogger.warn("auth.otp.verify_rate_limited", { email, phone, purpose });
      throw new AppError("Too many verification attempts. Please try again later.", 429);
    }
  }

  async requestOtp({ userId = null, email, phone, purpose, channel, metadata = {} }) {
    this.assertPurpose(purpose);
    const target = this.normalizeTarget({ email, phone });
    const deliveryChannel = channel ?? (target.email ? "email" : "sms");

    if (!VALID_CHANNELS.has(deliveryChannel)) {
      throw new AppError("OTP channel is invalid.", 400);
    }

    if (deliveryChannel === "email" && !target.email) {
      throw new AppError("Email is required for email OTP delivery.", 400);
    }

    if (["sms", "whatsapp"].includes(deliveryChannel) && !target.phone) {
      throw new AppError("Phone is required for SMS or WhatsApp OTP delivery.", 400);
    }

    await this.assertGenerationRateLimit({ userId, ...target, purpose });

    await this.otpModel.updateMany(otpSelector({ userId, ...target, purpose, used: false }), { used: true });

    const otp = this.generateOtp();
    const expiresAt = new Date(this.now().getTime() + this.config.otpExpiryMinutes * 60 * 1000);
    const record = await this.otpModel.create({
      userId,
      ...target,
      purpose,
      hashedOtp: hashOtp({ otp, purpose, ...target }),
      expiresAt,
    });

    const delivery =
      deliveryChannel === "email"
        ? await this.emailProvider.sendOtp({ email: target.email, otp, purpose, metadata })
        : await this.phoneProvider.sendOtp({ phone: target.phone, otp, channel: deliveryChannel, purpose, metadata });

    this.auditLogger.info("auth.otp.requested", {
      otpId: record._id.toString(),
      userId,
      email: target.email,
      phone: target.phone,
      purpose,
      channel: deliveryChannel,
      provider: delivery.provider,
      delivered: delivery.delivered,
    });

    return {
      otpId: record._id.toString(),
      expiresAt,
      channel: deliveryChannel,
      delivery,
      ...(this.config.nodeEnv === "production" ? {} : { otp }),
    };
  }

  async verifyOtp({ userId = null, email, phone, purpose, otp }) {
    this.assertPurpose(purpose);
    const target = this.normalizeTarget({ email, phone });
    this.assertVerificationRateLimit({ ...target, purpose });

    const record = await this.otpModel
      .findOne({
        ...otpSelector({ userId, ...target, purpose, used: false }),
        expiresAt: { $gt: this.now() },
      })
      .sort({ createdAt: -1 })
      .select("+hashedOtp");

    if (!record) {
      this.auditLogger.warn("auth.otp.verify_failed", {
        userId,
        email: target.email,
        phone: target.phone,
        purpose,
        reason: "missing_or_expired",
      });
      throw new AppError("Verification code is invalid or expired.", 400);
    }

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      record.used = true;
      await record.save({ validateModifiedOnly: true });
      throw new AppError("Verification code has too many failed attempts.", 429);
    }

    const candidateHash = hashOtp({ otp, purpose, ...target });

    if (candidateHash !== record.hashedOtp) {
      record.attempts += 1;
      if (record.attempts >= MAX_OTP_ATTEMPTS) {
        record.used = true;
      }
      await record.save({ validateModifiedOnly: true });
      this.auditLogger.warn("auth.otp.verify_failed", {
        otpId: record._id.toString(),
        userId,
        email: target.email,
        phone: target.phone,
        purpose,
        attempts: record.attempts,
        reason: "mismatch",
      });
      throw new AppError("Verification code is invalid or expired.", 400);
    }

    record.used = true;
    await record.save({ validateModifiedOnly: true });
    this.auditLogger.info("auth.otp.verified", {
      otpId: record._id.toString(),
      userId,
      email: target.email,
      phone: target.phone,
      purpose,
      attempts: record.attempts,
    });

    return {
      verified: true,
      otpId: record._id.toString(),
      userId: record.userId?.toString() ?? null,
      email: record.email,
      phone: record.phone,
      purpose: record.purpose,
    };
  }
}

export function createAuthenticationService() {
  const config = getEnv();

  return new AuthenticationService({
    config,
    emailProvider: new ResendEmailProvider({
      apiKey: config.resendApiKey,
      from: config.resendFromEmail,
    }),
    phoneProvider: new TwilioVerifyProvider({
      accountSid: config.twilioAccountSid,
      authToken: config.twilioAuthToken,
      serviceSid: config.twilioVerifyServiceSid,
    }),
  });
}
