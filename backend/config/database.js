import dotenv from "dotenv";
import mongoose from "mongoose";

import { logError, logger } from "../utils/logger.js";

dotenv.config();

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_RETRY_DELAY_MS = 2_000;

let isShutdownRegistered = false;
let isConnectionLoggingRegistered = false;

function getMongoUri() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("Missing required environment variable: MONGODB_URI.");
  }

  return mongoUri;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function registerConnectionLogging(connection = mongoose.connection) {
  if (isConnectionLoggingRegistered) {
    return;
  }

  isConnectionLoggingRegistered = true;

  connection.on("connected", () => {
    logger.info("database.connected");
  });

  connection.on("reconnected", () => {
    logger.warn("database.reconnected");
  });

  connection.on("disconnected", () => {
    logger.warn("database.disconnected");
  });

  connection.on("error", (error) => {
    logError(error, { event: "database.connection_error" });
  });
}

async function disconnect(signal) {
  try {
    await mongoose.connection.close(false);
    logger.info("database.connection_closed", { signal });
    process.exit(0);
  } catch (error) {
    logError(error, { event: "database.shutdown_error", signal });
    process.exit(1);
  }
}

function registerGracefulShutdown() {
  if (isShutdownRegistered || process.env.NODE_ENV === "test") {
    return;
  }

  isShutdownRegistered = true;
  process.once("SIGINT", () => {
    void disconnect("SIGINT");
  });
  process.once("SIGTERM", () => {
    void disconnect("SIGTERM");
  });
}

export async function connectDatabase(options = {}) {
  const {
    uri = getMongoUri(),
    maxRetries = Number(process.env.MONGODB_MAX_RETRIES ?? DEFAULT_MAX_RETRIES),
    retryDelayMs = Number(process.env.MONGODB_RETRY_DELAY_MS ?? DEFAULT_RETRY_DELAY_MS),
    mongooseOptions = {},
  } = options;

  registerConnectionLogging();
  registerGracefulShutdown();

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await mongoose.connect(uri, {
        autoIndex: process.env.NODE_ENV !== "production",
        serverSelectionTimeoutMS: 10_000,
        ...mongooseOptions,
      });
      return mongoose.connection;
    } catch (error) {
      lastError = error;
      logError(error, {
        event: "database.connection_attempt_failed",
        attempt,
        maxRetries,
      });

      if (attempt < maxRetries) {
        await delay(retryDelayMs);
      }
    }
  }

  throw new Error(`MongoDB connection failed after ${maxRetries} attempts: ${lastError?.message ?? "unknown error"}`);
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

export { mongoose };
