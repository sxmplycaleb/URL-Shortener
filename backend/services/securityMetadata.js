import crypto from "node:crypto";

import { getEnv } from "../config/env.js";

function firstHeaderValue(value) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return typeof value === "string" ? value.split(",")[0]?.trim() : undefined;
}

export function parseUserAgent(userAgent = "") {
  const source = userAgent.toLowerCase();
  const browser =
    source.includes("edg/")
      ? "Edge"
      : source.includes("crios/") || source.includes("chrome/")
        ? "Chrome"
        : source.includes("fxios/") || source.includes("firefox/")
          ? "Firefox"
          : source.includes("safari/") && !source.includes("chrome/") && !source.includes("crios/")
            ? "Safari"
            : source.includes("msie") || source.includes("trident/")
              ? "Internet Explorer"
              : "Unknown";

  const operatingSystem =
    source.includes("iphone") || source.includes("ipad")
      ? "iOS"
      : source.includes("windows")
      ? "Windows"
      : source.includes("mac os x")
        ? "macOS"
        : source.includes("android")
          ? "Android"
          : source.includes("linux")
            ? "Linux"
            : "Unknown";

  const device =
    source.includes("ipad")
      ? "Tablet"
      : source.includes("mobile") || source.includes("iphone") || source.includes("android")
        ? "Mobile"
        : "Desktop";

  return { browser, device, operatingSystem };
}

export function securityMetadataFromRequest(request) {
  const userAgent = request.get("user-agent") ?? "";
  const ipAddress = request.ip ?? request.socket?.remoteAddress ?? "Unknown";
  const country =
    firstHeaderValue(request.headers["cf-ipcountry"]) ??
    firstHeaderValue(request.headers["x-vercel-ip-country"]) ??
    firstHeaderValue(request.headers["x-country-code"]);

  return {
    ...parseUserAgent(userAgent),
    userAgent,
    ipAddress,
    country,
  };
}

export function trustedDeviceFingerprint({ userAgent = "", ipAddress = "" }) {
  return crypto.createHash("sha256").update(`${getEnv().hashSalt}:${userAgent}:${ipAddress}`).digest("hex");
}

export function maskIpAddress(ipAddress = "") {
  const value = String(ipAddress);

  if (!value || value === "Unknown") {
    return "Unknown";
  }

  const ipv4Match = value.match(/(?:^|:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  const ipv4 = ipv4Match?.[1];

  if (ipv4) {
    return ipv4.replace(/\.\d{1,3}$/, ".0");
  }

  if (value.includes(":")) {
    return `${value.split(":").slice(0, 4).join(":")}::`;
  }

  return value;
}
