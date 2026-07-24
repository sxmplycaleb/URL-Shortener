import { Buffer } from "node:buffer";
import { URLSearchParams } from "node:url";

import AppError from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

const BREVO_PROVIDER = "brevo";

function encodeForm(data) {
  return new URLSearchParams(
    Object.entries(data).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function otpSubject(purpose) {
  const subjects = {
    REGISTER: "Verify your Shortly email",
    CHANGE_EMAIL: "Verify your new Shortly email",
    LOGIN: "Your Shortly login code",
    RESET_PASSWORD: "Your Shortly password reset code",
  };

  return subjects[purpose] ?? "Your Shortly verification code";
}

function otpIntro(purpose) {
  const intros = {
    REGISTER: "Use this code to verify your email address.",
    CHANGE_EMAIL: "Use this code to verify your new email address.",
    LOGIN: "Use this code to sign in to Shortly.",
    RESET_PASSWORD: "Use this code to reset your Shortly password.",
  };

  return intros[purpose] ?? "Use this code to continue with Shortly.";
}

function buildOtpEmail({ otp, purpose, expiresInMinutes }) {
  const intro = otpIntro(purpose);

  return {
    subject: otpSubject(purpose),
    textContent: `${intro}\n\n${otp}\n\nThis code expires in ${expiresInMinutes} minutes. If you did not request it, you can ignore this email.`,
    htmlContent: `
      <p>${escapeHtml(intro)}</p>
      <p style="font-size: 24px; font-weight: 700; letter-spacing: 4px;">${escapeHtml(otp)}</p>
      <p>This code expires in ${escapeHtml(expiresInMinutes)} minutes.</p>
      <p>If you did not request it, you can ignore this email.</p>
    `,
  };
}

export class BrevoEmailProvider {
  constructor({ apiKey, senderName, senderEmail, expiresInMinutes = 5, fetchImplementation = globalThis.fetch } = {}) {
    this.apiKey = apiKey;
    this.senderName = senderName;
    this.senderEmail = senderEmail;
    this.expiresInMinutes = expiresInMinutes;
    this.fetch = fetchImplementation;
  }

  isConfigured() {
    return Boolean(this.apiKey && this.senderEmail && this.fetch);
  }

  sender() {
    return {
      ...(this.senderName ? { name: this.senderName } : {}),
      email: this.senderEmail,
    };
  }

  async sendEmail({ to, subject, textContent, htmlContent, tags = [] }) {
    if (!this.isConfigured()) {
      logger.warn("auth.email_provider_unconfigured", { provider: BREVO_PROVIDER, tags });
      return { provider: BREVO_PROVIDER, delivered: false };
    }

    const response = await this.fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: this.sender(),
        to: [{ email: to }],
        subject,
        textContent,
        htmlContent,
        ...(tags.length > 0 ? { tags } : {}),
      }),
    });

    if (!response.ok) {
      throw new AppError("Email could not be sent.", 502);
    }

    return { provider: BREVO_PROVIDER, delivered: true };
  }

  sendOtp({ email, otp, purpose }) {
    return this.sendEmail({
      to: email,
      ...buildOtpEmail({ otp, purpose, expiresInMinutes: this.expiresInMinutes }),
      tags: ["auth", "otp", purpose.toLowerCase()],
    });
  }

  sendPasswordResetLink({ email, resetUrl }) {
    return this.sendEmail({
      to: email,
      subject: "Reset your Shortly password",
      textContent: `Use this secure link to reset your Shortly password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request it, you can ignore this email.`,
      htmlContent: `
        <p>Use this secure link to reset your Shortly password:</p>
        <p><a href="${escapeHtml(resetUrl)}">Reset your password</a></p>
        <p>This link expires in 1 hour.</p>
        <p>If you did not request it, you can ignore this email.</p>
      `,
      tags: ["auth", "password-reset-link"],
    });
  }

  sendNewDeviceNotification({ email, device = "a new device", ip, location, loginAt = new Date() }) {
    const details = [
      `Device: ${device}`,
      ip ? `IP address: ${ip}` : null,
      location ? `Location: ${location}` : null,
      `Time: ${loginAt.toISOString()}`,
    ].filter(Boolean);

    return this.sendEmail({
      to: email,
      subject: "New sign-in to your Shortly account",
      textContent: `We noticed a sign-in to your Shortly account from ${device}.\n\n${details.join("\n")}\n\nIf this was not you, reset your password right away.`,
      htmlContent: `
        <p>We noticed a sign-in to your Shortly account from ${escapeHtml(device)}.</p>
        <ul>${details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join("")}</ul>
        <p>If this was not you, reset your password right away.</p>
      `,
      tags: ["auth", "new-device"],
    });
  }

  sendWelcomeEmail({ email, name = "there" }) {
    return this.sendEmail({
      to: email,
      subject: "Welcome to Shortly",
      textContent: `Hi ${name},\n\nWelcome to Shortly. You can now create, manage, and track your short links from your dashboard.`,
      htmlContent: `
        <p>Hi ${escapeHtml(name)},</p>
        <p>Welcome to Shortly. You can now create, manage, and track your short links from your dashboard.</p>
      `,
      tags: ["auth", "welcome"],
    });
  }
}

export class TwilioVerifyProvider {
  constructor({ accountSid, authToken, serviceSid, fetchImplementation = globalThis.fetch } = {}) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.serviceSid = serviceSid;
    this.fetch = fetchImplementation;
  }

  isConfigured() {
    return Boolean(this.accountSid && this.authToken && this.serviceSid && this.fetch);
  }

  async sendOtp({ phone, otp, channel = "sms", purpose }) {
    if (!this.isConfigured()) {
      logger.warn("auth.otp.phone_provider_unconfigured", { provider: "twilio_verify", channel, purpose });
      return { provider: "twilio_verify", channel, delivered: false };
    }

    const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");
    const response = await this.fetch(
      `https://verify.twilio.com/v2/Services/${this.serviceSid}/Verifications`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: encodeForm({
          To: phone,
          Channel: channel,
          CustomCode: otp,
        }),
      },
    );

    if (!response.ok) {
      throw new AppError("Phone verification code could not be sent.", 502);
    }

    return { provider: "twilio_verify", channel, delivered: true };
  }
}
