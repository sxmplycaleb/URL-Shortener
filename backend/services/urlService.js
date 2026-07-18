import mongoose from "mongoose";

import URLModel from "../models/URL.js";
import { generateShortCode } from "../utils/shortCode.js";
import AppError from "../utils/AppError.js";

const MAX_SHORT_CODE_ATTEMPTS = 8;

function isDuplicateKey(error) {
  return error?.code === 11000;
}

function toUrlResource(url) {
  return {
    id: url._id.toString(),
    originalUrl: url.originalUrl,
    shortCode: url.shortCode,
    customAlias: url.customAlias,
    clickCount: url.clickCount,
    expiresAt: url.expiresAt,
    isActive: url.isActive,
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
  const baseDocument = {
    originalUrl: payload.originalUrl,
    user: userId,
    expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : undefined,
  };

  if (payload.customAlias) {
    try {
      const url = await URLModel.create({
        ...baseDocument,
        shortCode: payload.customAlias,
        customAlias: payload.customAlias,
      });
      return toUrlResource(url);
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
      return toUrlResource(url);
    } catch (error) {
      if (!isDuplicateKey(error) || attempt === MAX_SHORT_CODE_ATTEMPTS) {
        throw error;
      }
    }
  }

  throw new AppError("Unable to generate a unique short code.", 500);
}

export async function listUrls(userId) {
  const urls = await URLModel.find({ user: userId }).sort({ createdAt: -1 });
  return urls.map(toUrlResource);
}

export async function getUrlForUser(userId, urlId) {
  assertObjectId(urlId, "URL ID");
  const url = await URLModel.findOne({ _id: urlId, user: userId });

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

  if (payload.expiresAt !== undefined) {
    updates.expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : undefined;
  }

  if (payload.isActive !== undefined) {
    updates.isActive = payload.isActive;
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

    return toUrlResource(url);
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
  const url = await URLModel.findOne({ shortCode });

  if (!url || !url.isActive || url.isExpired()) {
    throw new AppError("Short URL not found or expired.", 404);
  }

  return url;
}
