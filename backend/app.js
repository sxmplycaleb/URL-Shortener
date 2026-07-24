import fs from "node:fs";
import path from "node:path";

import cookieParser from "cookie-parser";
import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";

import { getEnv } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { createApiRateLimiter } from "./middleware/rateLimit.js";
import { requestLogger } from "./middleware/requestLogger.js";
import accountRoutes from "./routes/accountRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import redirectRoutes from "./routes/redirectRoutes.js";
import securityRoutes from "./routes/securityRoutes.js";
import urlRoutes from "./routes/urlRoutes.js";

const SPA_ROUTES = [
  "/",
  "/login",
  "/forgot-password",
  "/register",
  "/reset-password",
  "/dashboard",
  "/analytics",
  "/settings",
  "/settings/security",
  "/security",
];

function resolveStaticDir(staticDir) {
  return path.isAbsolute(staticDir) ? staticDir : path.resolve(process.cwd(), staticDir);
}

function sendHealth(response) {
  response.json({ status: "ok" });
}

function sendReadiness(response) {
  const ready = mongoose.connection.readyState === 1;
  response.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "unavailable",
    database: ready ? "connected" : "disconnected",
  });
}

export function createApp() {
  const { clientUrls, nodeEnv, staticDir, trustProxy } = getEnv();
  const staticAssetDir = resolveStaticDir(staticDir);
  const indexFile = path.join(staticAssetDir, "index.html");
  const serveStaticAssets = fs.existsSync(indexFile);
  const app = express();

  if (nodeEnv === "production" && !serveStaticAssets) {
    throw new Error(`Production static assets were not found at ${indexFile}. Run npm run build before starting.`);
  }

  app.set("trust proxy", trustProxy);
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
  app.use(compression());
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, !origin || clientUrls.includes(origin));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );
  app.use(express.json({ limit: "20kb" }));
  app.use(cookieParser());
  app.use(requestLogger);

  app.get(["/health", "/api/health"], (_request, response) => sendHealth(response));
  app.get(["/ready", "/api/ready"], (_request, response) => sendReadiness(response));

  app.use("/api", createApiRateLimiter());
  app.use(["/api/auth", "/api/account", "/api/urls", "/api/analytics", "/api/security"], (_request, response, next) => {
    response.set("Cache-Control", "no-store");
    next();
  });
  app.use("/api/auth", authRoutes);
  app.use("/api/account", accountRoutes);
  app.use("/api/urls", urlRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/security", securityRoutes);
  app.use("/api", notFoundHandler);

  if (serveStaticAssets) {
    app.use(
      express.static(staticAssetDir, {
        index: false,
        maxAge: nodeEnv === "production" ? "1y" : 0,
        immutable: nodeEnv === "production",
      }),
    );

    app.get(SPA_ROUTES, (_request, response) => {
      response.sendFile(indexFile);
    });
  }

  app.use("/", redirectRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
