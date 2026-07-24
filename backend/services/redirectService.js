import Click from "../models/Click.js";
import URLModel from "../models/URL.js";
import { findRedirectUrl } from "./urlService.js";
import AppError from "../utils/AppError.js";
import { comparePassword } from "../utils/password.js";

function parseUserAgent(userAgent = "") {
  const lowerUserAgent = userAgent.toLowerCase();

  const browser = lowerUserAgent.includes("firefox")
    ? "Firefox"
    : lowerUserAgent.includes("safari") && !lowerUserAgent.includes("chrome")
      ? "Safari"
      : lowerUserAgent.includes("edg")
        ? "Edge"
        : lowerUserAgent.includes("chrome")
          ? "Chrome"
          : "Unknown";

  const operatingSystem = lowerUserAgent.includes("windows")
    ? "Windows"
    : lowerUserAgent.includes("mac os")
      ? "macOS"
      : lowerUserAgent.includes("android")
        ? "Android"
        : lowerUserAgent.includes("iphone") || lowerUserAgent.includes("ipad")
          ? "iOS"
          : lowerUserAgent.includes("linux")
            ? "Linux"
            : "Unknown";

  const device = lowerUserAgent.includes("mobile") ? "Mobile" : "Desktop";

  return { browser, operatingSystem, device };
}

export async function resolveRedirect(shortCode, request, password) {
  const url = await findRedirectUrl(shortCode);

  if (url.passwordHash) {
    const unlocked = typeof password === "string" && (await comparePassword(password, url.passwordHash));

    if (!unlocked) {
      throw new AppError("Link password required.", 401);
    }
  }

  const userAgentData = parseUserAgent(request.get("user-agent"));

  await Click.create({
    url: url._id,
    visitorIp: request.ip,
    ...userAgentData,
    referrer: request.get("referer") ?? request.get("referrer"),
  });

  await URLModel.updateOne({ _id: url._id }, { $inc: { clickCount: 1 }, $set: { lastClickedAt: new Date() } });

  return url.originalUrl;
}
