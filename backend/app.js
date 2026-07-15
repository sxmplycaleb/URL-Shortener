import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { getEnv } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { createApiRateLimiter } from "./middleware/rateLimit.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import redirectRoutes from "./routes/redirectRoutes.js";
import urlRoutes from "./routes/urlRoutes.js";

export function createApp() {
  const { clientUrl } = getEnv();
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: clientUrl,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "20kb" }));
  app.use(cookieParser());

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.use("/api", createApiRateLimiter());
  app.use("/api/auth", authRoutes);
  app.use("/api/urls", urlRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api", notFoundHandler);
  app.use("/", redirectRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
