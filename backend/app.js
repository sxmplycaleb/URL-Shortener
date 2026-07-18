import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";

import { getEnv } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { createApiRateLimiter } from "./middleware/rateLimit.js";
import accountRoutes from "./routes/accountRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import redirectRoutes from "./routes/redirectRoutes.js";
import urlRoutes from "./routes/urlRoutes.js";

export function createApp() {
  const { clientUrls } = getEnv();
  const app = express();

  app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
        },
      },
      referrerPolicy: { policy: "no-referrer" },
    }),
  );
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, !origin || clientUrls.includes(origin));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "20kb" }));
  app.use(cookieParser());

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.get("/api/ready", (_request, response) => {
    const ready = mongoose.connection.readyState === 1;
    response.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "unavailable",
      database: ready ? "connected" : "disconnected",
    });
  });

  app.use("/api", createApiRateLimiter());
  app.use(["/api/auth", "/api/account", "/api/urls", "/api/analytics"], (_request, response, next) => {
    response.set("Cache-Control", "no-store");
    next();
  });
  app.use("/api/auth", authRoutes);
  app.use("/api/account", accountRoutes);
  app.use("/api/urls", urlRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api", notFoundHandler);
  app.use("/", redirectRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
