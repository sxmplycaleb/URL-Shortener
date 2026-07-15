import mongoose from "mongoose";

import Click from "../models/Click.js";
import URLModel from "../models/URL.js";
import AppError from "../utils/AppError.js";

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
