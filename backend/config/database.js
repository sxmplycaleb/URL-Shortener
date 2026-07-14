import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_RETRY_DELAY_MS = 2_000;

let isShutdownRegistered = false;

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
  connection.on("connected", () => {
    console.log("MongoDB connected.");
  });

  connection.on("reconnected", () => {
    console.log("MongoDB reconnected.");
  });

  connection.on("disconnected", () => {
    console.warn("MongoDB disconnected.");
  });

  connection.on("error", (error) => {
    console.error("MongoDB connection error:", error.message);
  });
}

async function disconnect(signal) {
  try {
    await mongoose.connection.close(false);
    console.log(`MongoDB connection closed${signal ? ` after ${signal}` : ""}.`);
    process.exit(0);
  } catch (error) {
    console.error("Error during MongoDB shutdown:", error.message);
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
      console.error(`MongoDB connection attempt ${attempt} of ${maxRetries} failed: ${error.message}`);

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
