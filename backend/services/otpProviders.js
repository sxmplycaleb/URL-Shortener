import { Buffer } from "node:buffer";
import { URLSearchParams } from "node:url";

import AppError from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

function encodeForm(data) {
  return new URLSearchParams(
    Object.entries(data).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

export class ResendEmailProvider {
  constructor({ apiKey, from, fetchImplementation = globalThis.fetch } = {}) {
    this.apiKey = apiKey;
    this.from = from;
    this.fetch = fetchImplementation;
  }

  isConfigured() {
    return Boolean(this.apiKey && this.from && this.fetch);
  }

  async sendOtp({ email, otp, purpose }) {
    if (!this.isConfigured()) {
      logger.warn("auth.otp.email_provider_unconfigured", { provider: "resend", purpose });
      return { provider: "resend", delivered: false };
    }

    const response = await this.fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: email,
        subject: "Your Shortly verification code",
        text: `Your verification code is ${otp}. It expires in 5 minutes.`,
      }),
    });

    if (!response.ok) {
      throw new AppError("Verification email could not be sent.", 502);
    }

    return { provider: "resend", delivered: true };
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
