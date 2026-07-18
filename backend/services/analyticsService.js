import mongoose from "mongoose";

import Click from "../models/Click.js";
import URLModel from "../models/URL.js";
import AppError from "../utils/AppError.js";

function formatDateLabel(date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function statusForUrl(url) {
  if (!url.isActive) {
    return "blocked";
  }

  if (url.expiresAt && url.expiresAt <= new Date()) {
    return "expired";
  }

  return "active";
}

function shortUrlForCode(shortCode) {
  const base = process.env.SHORT_URL_BASE || process.env.CLIENT_URL || "http://localhost:5000";
  return `${base.replace(/\/$/, "")}/${shortCode}`;
}

function toPercent(count, total) {
  if (total === 0) {
    return 0;
  }

  return Math.round((count / total) * 100);
}

function createEmptyActivity(days) {
  const today = startOfUtcDay(new Date());
  const entries = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - index);
    entries.push({
      label: formatDateLabel(date),
      clicks: 0,
    });
  }

  return entries;
}

function buildClickActivity(clicks, days) {
  const activity = createEmptyActivity(days);
  const byLabel = new Map(activity.map((point) => [point.label, point]));
  const since = startOfUtcDay(new Date());
  since.setUTCDate(since.getUTCDate() - days + 1);

  for (const click of clicks) {
    const clickedAt = new Date(click.clickedAt);

    if (clickedAt < since) {
      continue;
    }

    const label = formatDateLabel(startOfUtcDay(clickedAt));
    const point = byLabel.get(label);

    if (point) {
      point.clicks += 1;
    }
  }

  return activity;
}

function buildDeviceAnalytics(clicks) {
  const labels = ["Desktop", "Mobile", "Tablet"];
  const totals = new Map(labels.map((label) => [label, 0]));

  for (const click of clicks) {
    const rawDevice = String(click.device || "Desktop").toLowerCase();
    const label = rawDevice.includes("mobile") ? "Mobile" : rawDevice.includes("tablet") ? "Tablet" : "Desktop";
    totals.set(label, (totals.get(label) ?? 0) + 1);
  }

  return labels.map((name) => ({
    name,
    value: toPercent(totals.get(name) ?? 0, clicks.length),
  }));
}

function buildBrowserAnalytics(clicks) {
  const totals = new Map();

  for (const click of clicks) {
    const browser = click.browser || "Unknown";
    totals.set(browser, (totals.get(browser) ?? 0) + 1);
  }

  return Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, clicksCount]) => ({
      name,
      clicks: clicksCount,
      share: toPercent(clicksCount, clicks.length),
    }));
}

function buildLocationAnalytics(clicks) {
  const totals = new Map();

  for (const click of clicks) {
    const place = click.city || "Unknown";
    const country = click.country || "Unknown";
    const key = `${place}|${country}`;
    totals.set(key, {
      place,
      country,
      clicks: (totals.get(key)?.clicks ?? 0) + 1,
    });
  }

  return Array.from(totals.values())
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5)
    .map((item) => ({
      ...item,
      share: toPercent(item.clicks, clicks.length),
    }));
}

function buildTrend(currentCount, previousCount) {
  if (previousCount === 0 && currentCount === 0) {
    return { trend: "No clicks yet", trendDirection: "neutral" };
  }

  if (previousCount === 0) {
    return { trend: "+100% vs previous 30 days", trendDirection: "up" };
  }

  const delta = Math.round(((currentCount - previousCount) / previousCount) * 100);
  return {
    trend: `${delta >= 0 ? "+" : ""}${delta}% vs previous 30 days`,
    trendDirection: delta > 0 ? "up" : delta < 0 ? "down" : "neutral",
  };
}

export async function getDashboardAnalytics(userId) {
  const urls = await URLModel.find({ user: userId })
    .select("_id shortCode originalUrl clickCount createdAt expiresAt isActive")
    .sort({ createdAt: -1 })
    .lean();
  const urlIds = urls.map((url) => url._id);
  const clicks = await Click.find({ url: { $in: urlIds } })
    .select("clickedAt device browser city country")
    .sort({ clickedAt: -1 })
    .lean();

  const now = new Date();
  const currentPeriodStart = new Date(now);
  currentPeriodStart.setUTCDate(now.getUTCDate() - 30);
  const previousPeriodStart = new Date(now);
  previousPeriodStart.setUTCDate(now.getUTCDate() - 60);

  let currentClicks = 0;
  let previousClicks = 0;

  for (const click of clicks) {
    if (click.clickedAt >= currentPeriodStart) {
      currentClicks += 1;
    } else if (click.clickedAt >= previousPeriodStart) {
      previousClicks += 1;
    }
  }

  const trend = buildTrend(currentClicks, previousClicks);
  let activeUrls = 0;
  let newUrls = 0;

  for (const url of urls) {
    if (statusForUrl(url) === "active") {
      activeUrls += 1;
    }

    if (url.createdAt >= currentPeriodStart) {
      newUrls += 1;
    }
  }

  return {
    summary: [
      {
        id: "total-clicks",
        title: "Total clicks",
        value: clicks.length.toLocaleString("en"),
        icon: "clicks",
        ...trend,
      },
      {
        id: "total-links",
        title: "Total links created",
        value: urls.length.toLocaleString("en"),
        trend: `${newUrls.toLocaleString("en")} new in 30 days`,
        trendDirection: "neutral",
        icon: "links",
      },
      {
        id: "active-links",
        title: "Active links",
        value: activeUrls.toLocaleString("en"),
        trend: urls.length ? `${toPercent(activeUrls, urls.length)}% of all links` : "No links yet",
        trendDirection: "neutral",
        icon: "active",
      },
      {
        id: "click-growth",
        title: "Click growth",
        value: trend.trend.startsWith("No") ? "0%" : trend.trend.split(" ")[0],
        trend: trend.trend,
        trendDirection: trend.trendDirection,
        icon: "growth",
      },
    ],
    clickActivity: {
      "7d": buildClickActivity(clicks, 7),
      "30d": buildClickActivity(clicks, 30),
    },
    devices: buildDeviceAnalytics(clicks),
    browsers: buildBrowserAnalytics(clicks),
    locations: buildLocationAnalytics(clicks),
    links: urls.map((url) => ({
      id: url._id.toString(),
      shortUrl: shortUrlForCode(url.shortCode),
      originalUrl: url.originalUrl,
      totalClicks: url.clickCount,
      createdAt: url.createdAt,
      status: statusForUrl(url),
    })),
  };
}

export async function getUrlAnalytics(userId, urlId) {
  if (!mongoose.Types.ObjectId.isValid(urlId)) {
    throw new AppError("URL ID is invalid.", 400);
  }

  const url = await URLModel.findOne({ _id: urlId, user: userId });

  if (!url) {
    throw new AppError("URL not found.", 404);
  }

  const [totalClicks, recentClicks, topReferrers] = await Promise.all([
    Click.countDocuments({ url: url._id }),
    Click.find({ url: url._id }).sort({ clickedAt: -1 }).limit(10).lean(),
    Click.aggregate([
      { $match: { url: url._id, referrer: { $exists: true, $ne: "" } } },
      { $group: { _id: "$referrer", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, referrer: "$_id", count: 1 } },
    ]),
  ]);

  return {
    url: {
      id: url._id.toString(),
      originalUrl: url.originalUrl,
      shortCode: url.shortCode,
      clickCount: url.clickCount,
      createdAt: url.createdAt,
      expiresAt: url.expiresAt,
      isActive: url.isActive,
    },
    totalClicks,
    recentClicks: recentClicks.map((click) => ({
      id: click._id.toString(),
      browser: click.browser,
      operatingSystem: click.operatingSystem,
      device: click.device,
      country: click.country,
      city: click.city,
      referrer: click.referrer,
      clickedAt: click.clickedAt,
    })),
    topReferrers,
  };
}
