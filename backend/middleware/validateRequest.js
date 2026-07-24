import AppError from "../utils/AppError.js";
import {
  MAX_ALIAS_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MAX_TOKEN_LENGTH,
  MIN_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  MIN_SHORT_CODE_LENGTH,
  isCustomAlias,
  isHttpUrl,
  isStrongEnoughPassword,
  isValidEmail,
} from "../utils/validators.js";

const OTP_PURPOSES = new Set(["LOGIN", "REGISTER", "RESET_PASSWORD", "CHANGE_EMAIL", "CHANGE_PHONE"]);
const OTP_CHANNELS = new Set(["email", "sms", "whatsapp"]);
const OTP_REGEX = /^\d{6}$/;
const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

function assertObject(value, label = "Request body") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError(`${label} must be an object.`, 400);
  }
}

function requiredString(body, field) {
  const value = body[field];

  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError(`${field} is required.`, 400);
  }

  return value.trim();
}

function assertStrongPassword(password, field = "password") {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new AppError(`${field} must be at least ${MIN_PASSWORD_LENGTH} characters.`, 400);
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new AppError(`${field} cannot exceed ${MAX_PASSWORD_LENGTH} characters.`, 400);
  }

  if (!isStrongEnoughPassword(password)) {
    throw new AppError(`${field} must include uppercase, lowercase, number, and special characters.`, 400);
  }
}

function optionalDate(value, field) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime()) || date <= new Date()) {
    throw new AppError(`${field} must be a future date.`, 400);
  }

  return value;
}

function optionalCustomAlias(body) {
  const customAlias = body.customAlias?.trim();

  if (customAlias && (customAlias.length < MIN_SHORT_CODE_LENGTH || customAlias.length > MAX_ALIAS_LENGTH)) {
    throw new AppError(`customAlias must be between ${MIN_SHORT_CODE_LENGTH} and ${MAX_ALIAS_LENGTH} characters.`, 400);
  }

  if (customAlias && !isCustomAlias(customAlias)) {
    throw new AppError("customAlias contains invalid characters.", 400);
  }

  return customAlias;
}

export function validateRegister(request, _response, next) {
  try {
    assertObject(request.body);

    const name = requiredString(request.body, "name");
    const email = requiredString(request.body, "email").toLowerCase();
    const password = requiredString(request.body, "password");

    if (name.length > MAX_NAME_LENGTH) {
      throw new AppError(`name cannot exceed ${MAX_NAME_LENGTH} characters.`, 400);
    }

    if (name.length < MIN_NAME_LENGTH) {
      throw new AppError(`name must be at least ${MIN_NAME_LENGTH} characters.`, 400);
    }

    if (!isValidEmail(email)) {
      throw new AppError("email must be a valid permanent email address.", 400);
    }

    if (email.length > MAX_EMAIL_LENGTH) {
      throw new AppError(`email cannot exceed ${MAX_EMAIL_LENGTH} characters.`, 400);
    }

    assertStrongPassword(password);

    request.validatedBody = { name, email, password };
    next();
  } catch (error) {
    next(error);
  }
}

export function validateLogin(request, _response, next) {
  try {
    assertObject(request.body);

    const email = requiredString(request.body, "email").toLowerCase();

    if (!isValidEmail(email)) {
      throw new AppError("email must be a valid permanent email address.", 400);
    }

    request.validatedBody = {
      email,
      password: requiredString(request.body, "password"),
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function validateGoogleLogin(request, _response, next) {
  try {
    assertObject(request.body);

    const idToken = requiredString(request.body, "idToken");

    request.validatedBody = { idToken };
    next();
  } catch (error) {
    next(error);
  }
}

export function validateRefreshOrLogout(request, _response, next) {
  try {
    const refreshToken = request.body?.refreshToken ?? request.cookies?.refreshToken;

    if (typeof refreshToken !== "string" || refreshToken.trim() === "") {
      throw new AppError("refreshToken is required.", 400);
    }

    if (refreshToken.length > MAX_TOKEN_LENGTH) {
      throw new AppError(`refreshToken cannot exceed ${MAX_TOKEN_LENGTH} characters.`, 400);
    }

    request.validatedBody = { refreshToken };
    next();
  } catch (error) {
    next(error);
  }
}

export function validateForgotPassword(request, _response, next) {
  try {
    assertObject(request.body);

    const email = requiredString(request.body, "email").toLowerCase();

    if (!isValidEmail(email)) {
      throw new AppError("email must be a valid permanent email address.", 400);
    }

    if (email.length > MAX_EMAIL_LENGTH) {
      throw new AppError(`email cannot exceed ${MAX_EMAIL_LENGTH} characters.`, 400);
    }

    request.validatedBody = { email };
    next();
  } catch (error) {
    next(error);
  }
}

export function validateResetPassword(request, _response, next) {
  try {
    assertObject(request.body);

    const token = requiredString(request.body, "token");
    const password = requiredString(request.body, "password");

    if (token.length > MAX_TOKEN_LENGTH) {
      throw new AppError(`token cannot exceed ${MAX_TOKEN_LENGTH} characters.`, 400);
    }

    assertStrongPassword(password);

    request.validatedBody = { token, password };
    next();
  } catch (error) {
    next(error);
  }
}

function optionalEmail(body) {
  if (body.email === undefined || body.email === null || body.email === "") {
    return null;
  }

  const email = requiredString(body, "email").toLowerCase();

  if (!isValidEmail(email)) {
    throw new AppError("email must be a valid permanent email address.", 400);
  }

  if (email.length > MAX_EMAIL_LENGTH) {
    throw new AppError(`email cannot exceed ${MAX_EMAIL_LENGTH} characters.`, 400);
  }

  return email;
}

function optionalPhone(body) {
  if (body.phone === undefined || body.phone === null || body.phone === "") {
    return null;
  }

  const phone = requiredString(body, "phone");

  if (!PHONE_REGEX.test(phone)) {
    throw new AppError("phone must be a valid E.164 phone number.", 400);
  }

  return phone;
}

function requiredOtpPurpose(body) {
  const purpose = requiredString(body, "purpose").toUpperCase();

  if (!OTP_PURPOSES.has(purpose)) {
    throw new AppError("purpose is invalid.", 400);
  }

  return purpose;
}

function optionalOtpChannel(body) {
  if (body.channel === undefined || body.channel === null || body.channel === "") {
    return undefined;
  }

  const channel = requiredString(body, "channel").toLowerCase();

  if (!OTP_CHANNELS.has(channel)) {
    throw new AppError("channel is invalid.", 400);
  }

  return channel;
}

export function validateOtpRequest(request, _response, next) {
  try {
    assertObject(request.body);

    const email = optionalEmail(request.body);
    const phone = optionalPhone(request.body);

    if (!email && !phone) {
      throw new AppError("email or phone is required.", 400);
    }

    request.validatedBody = {
      userId: request.body.userId ?? null,
      email,
      phone,
      purpose: requiredOtpPurpose(request.body),
      channel: optionalOtpChannel(request.body),
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function validateOtpVerification(request, _response, next) {
  try {
    assertObject(request.body);

    const email = optionalEmail(request.body);
    const phone = optionalPhone(request.body);

    if (!email && !phone) {
      throw new AppError("email or phone is required.", 400);
    }

    const otp = requiredString(request.body, "otp");

    if (!OTP_REGEX.test(otp)) {
      throw new AppError("otp must be a 6-digit code.", 400);
    }

    request.validatedBody = {
      userId: request.body.userId ?? null,
      email,
      phone,
      purpose: requiredOtpPurpose(request.body),
      otp,
      rememberDevice: request.body.rememberDevice === true,
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function validateCreateUrl(request, _response, next) {
  try {
    assertObject(request.body);

    const originalUrl = requiredString(request.body, "originalUrl");
    const customAlias = optionalCustomAlias(request.body);

    if (!isHttpUrl(originalUrl)) {
      throw new AppError("originalUrl must be a valid http or https URL.", 400);
    }

    request.validatedBody = {
      originalUrl,
      customAlias,
      expiresAt: optionalDate(request.body.expiresAt, "expiresAt"),
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function validateUpdateUrl(request, _response, next) {
  try {
    assertObject(request.body);

    const body = {};

    if (request.body.originalUrl !== undefined) {
      const originalUrl = requiredString(request.body, "originalUrl");

      if (!isHttpUrl(originalUrl)) {
        throw new AppError("originalUrl must be a valid http or https URL.", 400);
      }

      body.originalUrl = originalUrl;
    }

    if (request.body.customAlias !== undefined) {
      const customAlias = optionalCustomAlias(request.body);
      body.customAlias = customAlias ?? "";
    }

    if (request.body.expiresAt !== undefined) {
      body.expiresAt = optionalDate(request.body.expiresAt, "expiresAt") ?? "";
    }

    if (request.body.isActive !== undefined) {
      if (typeof request.body.isActive !== "boolean") {
        throw new AppError("isActive must be a boolean.", 400);
      }

      body.isActive = request.body.isActive;
    }

    if (Object.keys(body).length === 0) {
      throw new AppError("At least one URL field is required.", 400);
    }

    request.validatedBody = body;
    next();
  } catch (error) {
    next(error);
  }
}

export function validateUpdateProfile(request, _response, next) {
  try {
    assertObject(request.body);

    const name = requiredString(request.body, "name");
    const email = requiredString(request.body, "email").toLowerCase();

    if (!isValidEmail(email)) {
      throw new AppError("email must be a valid permanent email address.", 400);
    }

    if (name.length < MIN_NAME_LENGTH) {
      throw new AppError(`name must be at least ${MIN_NAME_LENGTH} characters.`, 400);
    }

    if (name.length > MAX_NAME_LENGTH) {
      throw new AppError(`name cannot exceed ${MAX_NAME_LENGTH} characters.`, 400);
    }

    if (email.length > MAX_EMAIL_LENGTH) {
      throw new AppError(`email cannot exceed ${MAX_EMAIL_LENGTH} characters.`, 400);
    }

    request.validatedBody = { name, email };
    next();
  } catch (error) {
    next(error);
  }
}

export function validateUpdatePassword(request, _response, next) {
  try {
    assertObject(request.body);

    const currentPassword = requiredString(request.body, "currentPassword");
    const newPassword = requiredString(request.body, "newPassword");

    assertStrongPassword(newPassword, "newPassword");

    request.validatedBody = { currentPassword, newPassword };
    next();
  } catch (error) {
    next(error);
  }
}

export function validateUpdateAccountSettings(request, _response, next) {
  try {
    assertObject(request.body);

    if (typeof request.body.notificationsEnabled !== "boolean") {
      throw new AppError("notificationsEnabled must be a boolean.", 400);
    }

    request.validatedBody = {
      notificationsEnabled: request.body.notificationsEnabled,
    };
    next();
  } catch (error) {
    next(error);
  }
}
