import { getEnv } from "../config/env.js";

export function getShortUrlBase() {
  return getEnv().shortUrlBase.replace(/\/+$/, "");
}

export function buildShortUrl(shortCode) {
  return `${getShortUrlBase()}/${encodeURIComponent(shortCode)}`;
}
