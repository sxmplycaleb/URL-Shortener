import mongoose from "mongoose";

import AppError from "../utils/AppError.js";

function normalizeError(error) {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return new AppError("Validation failed.", 400, Object.values(error.errors).map((item) => item.message));
  }

  if (error instanceof mongoose.Error.CastError) {
    return new AppError("Invalid resource identifier.", 400);
  }

  if (error.code === 11000) {
    return new AppError("Duplicate resource.", 409);
  }

  return new AppError("Internal server error.", 500);
}

export function notFoundHandler(request, _response, next) {
  next(new AppError(`API route not found: ${request.method} ${request.originalUrl}`, 404));
}

export function errorHandler(error, _request, response, _next) {
  void _next;

  const normalizedError = normalizeError(error);
  const statusCode = normalizedError.statusCode ?? 500;

  if (statusCode >= 500) {
    console.error(error);
  }

  response.status(statusCode).json({
    error: {
      message: normalizedError.message,
      details: normalizedError.details,
    },
  });
}
