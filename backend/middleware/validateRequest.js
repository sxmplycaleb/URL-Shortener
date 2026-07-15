import AppError from "../utils/AppError.js";
import { isCustomAlias, isHttpUrl, isStrongEnoughPassword, isValidEmail } from "../utils/validators.js";

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

export function validateRegister(request, _response, next) {
  try {
    assertObject(request.body);

    const name = requiredString(request.body, "name");
    const email = requiredString(request.body, "email").toLowerCase();
    const password = requiredString(request.body, "password");

    if (!isValidEmail(email)) {
      throw new AppError("email must be a valid email address.", 400);
    }

    if (!isStrongEnoughPassword(password)) {
      throw new AppError("password must include uppercase, lowercase, and numeric characters.", 400);
    }

    request.validatedBody = { name, email, password };
    next();
  } catch (error) {
    next(error);
  }
}

export function validateLogin(request, _response, next) {
  try {
    assertObject(request.body);

    request.validatedBody = {
      email: requiredString(request.body, "email").toLowerCase(),
      password: requiredString(request.body, "password"),
    };
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

    request.validatedBody = { refreshToken };
    next();
  } catch (error) {
    next(error);
  }
}

export function validateCreateUrl(request, _response, next) {
  try {
    assertObject(request.body);

    const originalUrl = requiredString(request.body, "originalUrl");
    const customAlias = request.body.customAlias?.trim();

    if (!isHttpUrl(originalUrl)) {
      throw new AppError("originalUrl must be a valid http or https URL.", 400);
    }

    if (customAlias && !isCustomAlias(customAlias)) {
      throw new AppError("customAlias contains invalid characters.", 400);
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
      const customAlias = request.body.customAlias?.trim();

      if (customAlias && !isCustomAlias(customAlias)) {
        throw new AppError("customAlias contains invalid characters.", 400);
      }

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
      throw new AppError("email must be a valid email address.", 400);
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

    if (!isStrongEnoughPassword(newPassword)) {
      throw new AppError("newPassword must include uppercase, lowercase, and numeric characters.", 400);
    }

    request.validatedBody = { currentPassword, newPassword };
    next();
  } catch (error) {
    next(error);
  }
}
