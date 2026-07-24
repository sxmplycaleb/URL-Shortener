import mongoose from "mongoose";

import URLModel from "../models/URL.js";
import { generateShortCode } from "../utils/shortCode.js";
import { buildShortUrl } from "../utils/shortUrl.js";
import AppError from "../utils/AppError.js";
import { hashPassword } from "../utils/password.js";

const MAX_SHORT_CODE_ATTEMPTS = 8;

function isDuplicateKey(error) {
  return error?.code === 11000;
}

function toUrlResource(url) {
  return {
    id: url._id.toString(),
    originalUrl: url.originalUrl,
    shortCode: url.shortCode,
    shortUrl: buildShortUrl(url.shortCode),
    customAlias: url.customAlias,
    title: url.title ?? "",
    notes: url.notes ?? "",
    clickCount: url.clickCount,
    expiresAt: url.expiresAt,
    activatesAt: url.activatesAt,
    deactivatesAt: url.deactivatesAt,
    isPasswordProtected: Boolean(url.passwordHash),
    isActive: url.isActive,
    isFavorite: url.isFavorite,
    isArchived: url.isArchived,
    hasQrCode: url.hasQrCode,
    shareCount: url.shareCount,
    lastClickedAt: url.lastClickedAt,
    tags: url.tags ?? [],
    createdAt: url.createdAt,
    updatedAt: url.updatedAt,
  };
}

function assertObjectId(value, name = "ID") {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new AppError(`${name} is invalid.`, 400);
  }
}

async function findOneAndUpdateWithGeneratedShortCode(filter, updates) {
  for (let attempt = 1; attempt <= MAX_SHORT_CODE_ATTEMPTS; attempt += 1) {
    try {
      return await URLModel.findOneAndUpdate(
        filter,
        {
          ...updates,
          shortCode: generateShortCode(),
        },
        {
          returnDocument: "after",
          runValidators: true,
        },
      );
    } catch (error) {
      if (!isDuplicateKey(error) || attempt === MAX_SHORT_CODE_ATTEMPTS) {
        throw error;
      }
    }
  }

  throw new AppError("Unable to generate a unique short code.", 500);
}

export async function createUrl(userId, payload) {
  const duplicateUrls = await findDuplicateUrls(userId, payload.originalUrl);
  const baseDocument = {
    originalUrl: payload.originalUrl,
    title: payload.title,
    notes: payload.notes,
    user: userId,
    expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : undefined,
    activatesAt: payload.activatesAt ? new Date(payload.activatesAt) : undefined,
    deactivatesAt: payload.deactivatesAt ? new Date(payload.deactivatesAt) : undefined,
    passwordHash: payload.password ? await hashPassword(payload.password) : undefined,
  };

  if (payload.customAlias) {
    try {
      const url = await URLModel.create({
        ...baseDocument,
        shortCode: payload.customAlias,
        customAlias: payload.customAlias,
      });
      return { url: toUrlResource(url), duplicates: duplicateUrls };
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw new AppError("That custom alias is already in use.", 409);
      }

      throw error;
    }
  }

  for (let attempt = 1; attempt <= MAX_SHORT_CODE_ATTEMPTS; attempt += 1) {
    try {
      const url = await URLModel.create({
        ...baseDocument,
        shortCode: generateShortCode(),
      });
      return { url: toUrlResource(url), duplicates: duplicateUrls };
    } catch (error) {
      if (!isDuplicateKey(error) || attempt === MAX_SHORT_CODE_ATTEMPTS) {
        throw error;
      }
    }
  }

  throw new AppError("Unable to generate a unique short code.", 500);
}

export async function listUrls(userId) {
  const urls = await URLModel.find({ user: userId }).select("+passwordHash").sort({ createdAt: -1 }).lean();
  return urls.map(toUrlResource);
}

export async function getUrlForUser(userId, urlId) {
  assertObjectId(urlId, "URL ID");
  const url = await URLModel.findOne({ _id: urlId, user: userId }).select("+passwordHash");

  if (!url) {
    throw new AppError("URL not found.", 404);
  }

  return toUrlResource(url);
}

export async function updateUrl(userId, urlId, payload) {
  assertObjectId(urlId, "URL ID");

  const updates = {};

  if (payload.originalUrl !== undefined) {
    updates.originalUrl = payload.originalUrl;
  }

  if (payload.title !== undefined) {
    updates.title = payload.title;
  }

  if (payload.notes !== undefined) {
    updates.notes = payload.notes;
  }

  if (payload.expiresAt !== undefined) {
    updates.expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : undefined;
  }

  if (payload.activatesAt !== undefined) {
    updates.activatesAt = payload.activatesAt ? new Date(payload.activatesAt) : undefined;
  }

  if (payload.deactivatesAt !== undefined) {
    updates.deactivatesAt = payload.deactivatesAt ? new Date(payload.deactivatesAt) : undefined;
  }

  if (payload.password !== undefined) {
    updates.passwordHash = payload.password ? await hashPassword(payload.password) : undefined;
  }

  if (payload.isActive !== undefined) {
    updates.isActive = payload.isActive;
  }

  if (payload.isFavorite !== undefined) {
    updates.isFavorite = payload.isFavorite;
  }

  if (payload.isArchived !== undefined) {
    updates.isArchived = payload.isArchived;
  }

  if (payload.hasQrCode !== undefined) {
    updates.hasQrCode = payload.hasQrCode;
  }

  if (payload.shareCount !== undefined) {
    updates.shareCount = payload.shareCount;
  }

  if (payload.tags !== undefined) {
    updates.tags = payload.tags;
  }

  if (payload.customAlias !== undefined) {
    updates.customAlias = payload.customAlias || undefined;

    if (payload.customAlias) {
      updates.shortCode = payload.customAlias;
    }
  }

  try {
    const filter = { _id: urlId, user: userId };
    const url = payload.customAlias === ""
      ? await findOneAndUpdateWithGeneratedShortCode(filter, updates)
      : await URLModel.findOneAndUpdate(filter, updates, {
          returnDocument: "after",
          runValidators: true,
        });

    if (!url) {
      throw new AppError("URL not found.", 404);
    }

    const refreshedUrl = await URLModel.findById(url._id).select("+passwordHash");
    return toUrlResource(refreshedUrl ?? url);
  } catch (error) {
    if (isDuplicateKey(error)) {
      throw new AppError("That custom alias is already in use.", 409);
    }

    throw error;
  }
}

export async function deleteUrl(userId, urlId) {
  assertObjectId(urlId, "URL ID");
  const result = await URLModel.deleteOne({ _id: urlId, user: userId });

  if (result.deletedCount === 0) {
    throw new AppError("URL not found.", 404);
  }
}

export async function findRedirectUrl(shortCode) {
  const url = await URLModel.findOne({ shortCode }).select("+passwordHash");

  if (!url) {
    throw new AppError("Link not found.", 404);
  }

  if (!url.isActive) {
    throw new AppError("Link disabled.", 410);
  }

  if (url.isScheduledInactive()) {
    throw new AppError(url.activatesAt && url.activatesAt > new Date() ? "Link not active yet." : "Link disabled.", 410);
  }

  if (url.isExpired()) {
    throw new AppError("Link expired.", 410);
  }

  return url;
}

export async function findDuplicateUrls(userId, originalUrl, excludeId) {
  const filter = { user: userId, originalUrl };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  const urls = await URLModel.find(filter)
    .select("_id shortCode originalUrl title clickCount createdAt")
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  return urls.map((url) => ({
    id: url._id.toString(),
    shortUrl: buildShortUrl(url.shortCode),
    originalUrl: url.originalUrl,
    title: url.title ?? "",
    clickCount: url.clickCount,
    createdAt: url.createdAt,
  }));
}
