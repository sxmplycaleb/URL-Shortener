import mongoose from "mongoose";

import Click from "../models/Click.js";
import URLModel from "../models/URL.js";
import AppError from "../utils/AppError.js";
import { buildShortUrl } from "../utils/shortUrl.js";

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

  if ((url.activatesAt && url.activatesAt > new Date()) || (url.deactivatesAt && url.deactivatesAt <= new Date())) {
    return "blocked";
  }

  return "active";
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

function buildCountBreakdown(items, total, nameKey = "name", limit = 8) {
  return items.slice(0, limit).map((item) => ({
    name: item._id || "Unknown",
    [nameKey]: item._id || "Unknown",
    clicks: item.clicks,
    share: toPercent(item.clicks, total),
  }));
}

function isoWeekLabel(date) {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target - yearStart) / 86_400_000 + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function buildActivitySeries(clicks, unit, count) {
  const now = new Date();
  const points = [];
  const keys = new Map();

  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(now);

    if (unit === "hour") date.setUTCHours(now.getUTCHours() - index, 0, 0, 0);
    if (unit === "day") date.setUTCDate(now.getUTCDate() - index);
    if (unit === "week") date.setUTCDate(now.getUTCDate() - index * 7);
    if (unit === "month") date.setUTCMonth(now.getUTCMonth() - index, 1);

    const key = unit === "hour"
      ? date.toISOString().slice(0, 13)
      : unit === "day"
        ? date.toISOString().slice(0, 10)
        : unit === "week"
          ? isoWeekLabel(date)
          : date.toISOString().slice(0, 7);
    const point = {
      label: unit === "hour" ? `${String(date.getUTCHours()).padStart(2, "0")}:00` : key,
      clicks: 0,
    };
    points.push(point);
    keys.set(key, point);
  }

  for (const click of clicks) {
    const clickedAt = new Date(click.clickedAt);
    const key = unit === "hour"
      ? clickedAt.toISOString().slice(0, 13)
      : unit === "day"
        ? clickedAt.toISOString().slice(0, 10)
        : unit === "week"
          ? isoWeekLabel(clickedAt)
          : clickedAt.toISOString().slice(0, 7);
    const point = keys.get(key);
    if (point) point.clicks += 1;
  }

  return points;
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
    .select("_id shortCode originalUrl title clickCount shareCount createdAt updatedAt expiresAt activatesAt deactivatesAt isActive isArchived")
    .sort({ createdAt: -1 })
    .lean();
  const urlIds = urls.map((url) => url._id);

  const now = new Date();
  const currentPeriodStart = new Date(now);
  currentPeriodStart.setUTCDate(now.getUTCDate() - 30);
  const previousPeriodStart = new Date(now);
  previousPeriodStart.setUTCDate(now.getUTCDate() - 60);

  const [
    totalClicks,
    currentClicks,
    previousClicks,
    recentClicks,
    deviceTotals,
    browserTotals,
    osTotals,
    referrerTotals,
    countryTotals,
    locationTotals,
  ] = await Promise.all([
    Click.countDocuments({ url: { $in: urlIds } }),
    Click.countDocuments({ url: { $in: urlIds }, clickedAt: { $gte: currentPeriodStart } }),
    Click.countDocuments({ url: { $in: urlIds }, clickedAt: { $gte: previousPeriodStart, $lt: currentPeriodStart } }),
    Click.find({ url: { $in: urlIds }, clickedAt: { $gte: previousPeriodStart } })
      .select("clickedAt device browser operatingSystem city country referrer")
      .sort({ clickedAt: -1 })
      .lean(),
    Click.aggregate([{ $match: { url: { $in: urlIds } } }, { $group: { _id: { $ifNull: ["$device", "Unknown"] }, clicks: { $sum: 1 } } }, { $sort: { clicks: -1 } }]),
    Click.aggregate([{ $match: { url: { $in: urlIds } } }, { $group: { _id: { $ifNull: ["$browser", "Unknown"] }, clicks: { $sum: 1 } } }, { $sort: { clicks: -1 } }, { $limit: 8 }]),
    Click.aggregate([{ $match: { url: { $in: urlIds } } }, { $group: { _id: { $ifNull: ["$operatingSystem", "Unknown"] }, clicks: { $sum: 1 } } }, { $sort: { clicks: -1 } }, { $limit: 8 }]),
    Click.aggregate([{ $match: { url: { $in: urlIds }, referrer: { $exists: true, $ne: "" } } }, { $group: { _id: "$referrer", clicks: { $sum: 1 } } }, { $sort: { clicks: -1 } }, { $limit: 8 }]),
    Click.aggregate([{ $match: { url: { $in: urlIds } } }, { $group: { _id: { $ifNull: ["$country", "Unknown"] }, clicks: { $sum: 1 } } }, { $sort: { clicks: -1 } }, { $limit: 8 }]),
    Click.aggregate([
      { $match: { url: { $in: urlIds } } },
      { $group: { _id: { city: { $ifNull: ["$city", "Unknown"] }, country: { $ifNull: ["$country", "Unknown"] } }, clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      { $limit: 5 },
    ]),
  ]);

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
        value: totalClicks.toLocaleString("en"),
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
      "7d": buildClickActivity(recentClicks, 7),
      "30d": buildClickActivity(recentClicks, 30),
    },
    devices: ["Desktop", "Mobile", "Tablet"].map((name) => ({
      name,
      value: toPercent(deviceTotals.find((item) => item._id === name)?.clicks ?? 0, totalClicks),
    })),
    browsers: buildCountBreakdown(browserTotals, totalClicks).map((item) => ({ name: item.name, clicks: item.clicks, share: item.share })),
    operatingSystems: buildCountBreakdown(osTotals, totalClicks).map((item) => ({ name: item.name, clicks: item.clicks, share: item.share })),
    referrers: buildCountBreakdown(referrerTotals, totalClicks).map((item) => ({ name: item.name, clicks: item.clicks, share: item.share })),
    countries: buildCountBreakdown(countryTotals, totalClicks).map((item) => ({ name: item.name, clicks: item.clicks, share: item.share })),
    locations: locationTotals.map((item) => ({
      place: item._id.city,
      country: item._id.country,
      clicks: item.clicks,
      share: toPercent(item.clicks, totalClicks),
    })),
    activity: {
      hourly: buildActivitySeries(recentClicks, "hour", 24),
      daily: buildActivitySeries(recentClicks, "day", 14),
      weekly: buildActivitySeries(recentClicks, "week", 8),
      monthly: buildActivitySeries(recentClicks, "month", 12),
    },
    topUrls: urls
      .slice()
      .sort((left, right) => right.clickCount - left.clickCount)
      .slice(0, 5)
      .map((url) => ({
        id: url._id.toString(),
        title: url.title ?? url.shortCode,
        shortUrl: buildShortUrl(url.shortCode),
        originalUrl: url.originalUrl,
        totalClicks: url.clickCount,
      })),
    insights: buildInsights(urls, recentClicks),
    links: urls.map((url) => ({
      id: url._id.toString(),
      shortUrl: buildShortUrl(url.shortCode),
      originalUrl: url.originalUrl,
      totalClicks: url.clickCount,
      createdAt: url.createdAt,
      status: statusForUrl(url),
    })),
  };
}

function buildInsights(urls, recentClicks) {
  const now = new Date();
  const today = startOfUtcDay(now);
  const best = urls.slice().sort((left, right) => right.clickCount - left.clickCount)[0];
  const mostShared = urls.slice().sort((left, right) => (right.shareCount ?? 0) - (left.shareCount ?? 0))[0];
  const inactiveCount = urls.filter((url) => statusForUrl(url) !== "active" || url.isArchived).length;
  const todayClicks = recentClicks.filter((click) => new Date(click.clickedAt) >= today).length;
  const latestClick = recentClicks[0];

  return [
    {
      id: "best-performing",
      title: "Best performing link",
      value: best ? buildShortUrl(best.shortCode) : "No links yet",
      detail: best ? `${best.clickCount.toLocaleString("en")} total clicks` : "Create a link to start collecting data",
    },
    {
      id: "biggest-growth",
      title: "Biggest growth",
      value: `${todayClicks.toLocaleString("en")} today`,
      detail: "Clicks recorded since UTC midnight",
    },
    {
      id: "recent-activity",
      title: "Recent activity",
      value: latestClick ? formatDateLabel(new Date(latestClick.clickedAt)) : "No clicks yet",
      detail: latestClick ? "Latest redirect recorded" : "Traffic appears here after redirects",
    },
    {
      id: "most-shared",
      title: "Most shared",
      value: mostShared ? buildShortUrl(mostShared.shortCode) : "No shares yet",
      detail: mostShared ? `${(mostShared.shareCount ?? 0).toLocaleString("en")} shares` : "Use dashboard share actions to track sharing",
    },
    {
      id: "inactive-links",
      title: "Inactive links",
      value: inactiveCount.toLocaleString("en"),
      detail: "Disabled, expired, scheduled inactive, or archived links",
    },
  ];
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
