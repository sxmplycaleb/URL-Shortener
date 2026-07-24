import APIKey from "../models/APIKey.js";
import APIUsage from "../models/APIUsage.js";
import AppError from "../utils/AppError.js";

function toApiKeyResource(apiKey) {
  return {
    id: apiKey._id.toString(),
    name: apiKey.name,
    prefix: apiKey.prefix,
    scopes: apiKey.scopes,
    lastUsedAt: apiKey.lastUsedAt,
    revokedAt: apiKey.revokedAt,
    createdAt: apiKey.createdAt,
  };
}

export async function createApiKey(userId, payload) {
  const plainKey = APIKey.generatePlainKey();
  const apiKey = await APIKey.create({
    user: userId,
    name: payload.name,
    keyHash: APIKey.hashPlainKey(plainKey),
    prefix: APIKey.prefixForKey(plainKey),
    scopes: payload.scopes,
  });

  return {
    apiKey: toApiKeyResource(apiKey),
    key: plainKey,
  };
}

export async function listApiKeys(userId) {
  const keys = await APIKey.find({ user: userId }).sort({ createdAt: -1 }).lean();
  return keys.map(toApiKeyResource);
}

export async function revokeApiKey(userId, apiKeyId) {
  const apiKey = await APIKey.findOneAndUpdate(
    { _id: apiKeyId, user: userId },
    { revokedAt: new Date() },
    { returnDocument: "after" },
  );

  if (!apiKey) {
    throw new AppError("API key not found.", 404);
  }

  return toApiKeyResource(apiKey);
}

export async function findUserForApiKey(plainKey) {
  if (!plainKey) {
    throw new AppError("API key is required.", 401);
  }

  const apiKey = await APIKey.findOne({ keyHash: APIKey.hashPlainKey(plainKey), revokedAt: { $exists: false } })
    .select("+keyHash")
    .populate("user");

  if (!apiKey?.user) {
    throw new AppError("API key is invalid or revoked.", 401);
  }

  apiKey.lastUsedAt = new Date();
  await apiKey.save();

  return { user: apiKey.user, apiKey };
}

export async function recordApiUsage({ userId, apiKeyId, method, path, statusCode, durationMs }) {
  await APIUsage.create({
    user: userId,
    apiKey: apiKeyId,
    method,
    path,
    statusCode,
    durationMs,
  });
}

export async function getApiUsageSummary(userId) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [total, byDay] = await Promise.all([
    APIUsage.countDocuments({ user: userId, usedAt: { $gte: since } }),
    APIUsage.aggregate([
      { $match: { user: userId, usedAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { date: "$usedAt", format: "%Y-%m-%d", timezone: "UTC" } },
          requests: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", requests: 1 } },
    ]),
  ]);

  return { totalRequests30d: total, dailyUsage: byDay };
}
