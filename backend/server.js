import { connectDatabase } from "./config/database.js";
import { getEnv } from "./config/env.js";
import { createApp } from "./app.js";
import { logError, logFatal, logger } from "./utils/logger.js";

function registerProcessErrorLogging() {
  process.on("unhandledRejection", (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logFatal(error, { event: "process.unhandled_rejection" });
  });

  process.on("uncaughtException", (error) => {
    logFatal(error, { event: "process.uncaught_exception" });
    process.exit(1);
  });
}

async function startServer() {
  const { nodeEnv, port, staticDir, trustProxy } = getEnv();

  registerProcessErrorLogging();
  logger.info("application.starting", {
    nodeEnv,
    port,
    staticDir,
    trustProxy,
  });

  await connectDatabase();

  const app = createApp();
  const server = app.listen(port, () => {
    logger.info("application.started", {
      nodeEnv,
      port,
      staticDir,
      trustProxy,
    });
  });

  server.on("error", (error) => {
    logError(error, { event: "server.error" });
  });
}

startServer().catch((error) => {
  logFatal(error, { event: "application.start_failed" });
  process.exitCode = 1;
});
