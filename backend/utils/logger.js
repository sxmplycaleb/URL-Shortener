const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

const DEFAULT_LEVEL_BY_ENV = {
  development: "debug",
  production: "info",
  test: "warn",
};

let errorReporter = null;

function currentEnv() {
  return process.env.NODE_ENV ?? "development";
}

function currentLevel() {
  const configuredLevel = process.env.LOG_LEVEL?.toLowerCase();
  return LEVELS[configuredLevel] == null ? DEFAULT_LEVEL_BY_ENV[currentEnv()] : configuredLevel;
}

function shouldLog(level) {
  return LEVELS[level] >= LEVELS[currentLevel()];
}

function sanitizeValue(value) {
  if (value instanceof Error) {
    return serializeError(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !/authorization|cookie|password|secret|token|uri|url/i.test(key))
        .map(([key, item]) => [key, sanitizeValue(item)]),
    );
  }

  return value;
}

function serializeError(error) {
  return {
    name: error.name,
    message: error.message,
    stack: currentEnv() === "production" ? undefined : error.stack,
  };
}

function write(level, event, metadata = {}) {
  if (!shouldLog(level)) {
    return;
  }

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...sanitizeValue(metadata),
  };

  if (currentEnv() === "production") {
    console[level === "fatal" ? "error" : level](JSON.stringify(entry));
    return;
  }

  const details = Object.keys(entry).length > 3 ? ` ${JSON.stringify(entry)}` : "";
  console[level === "fatal" ? "error" : level](`[${entry.timestamp}] ${level.toUpperCase()} ${event}${details}`);
}

export const logger = {
  debug(event, metadata) {
    write("debug", event, metadata);
  },
  info(event, metadata) {
    write("info", event, metadata);
  },
  warn(event, metadata) {
    write("warn", event, metadata);
  },
  error(event, metadata) {
    write("error", event, metadata);
  },
  fatal(event, metadata) {
    write("fatal", event, metadata);
  },
};

export function setErrorReporter(reporter) {
  errorReporter = reporter;
}

export function logError(error, metadata = {}) {
  logger.error(metadata.event ?? "application.error", {
    ...metadata,
    error,
  });

  if (errorReporter) {
    errorReporter(error, sanitizeValue(metadata));
  }
}

export function logFatal(error, metadata = {}) {
  logger.fatal(metadata.event ?? "application.fatal", {
    ...metadata,
    error,
  });

  if (errorReporter) {
    errorReporter(error, sanitizeValue({ ...metadata, fatal: true }));
  }
}
