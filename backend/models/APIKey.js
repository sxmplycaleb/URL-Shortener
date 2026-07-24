import crypto from "node:crypto";

import mongoose from "mongoose";

import { hashToken } from "../utils/hash.js";

const { Schema, model, models } = mongoose;

const apiKeySchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "API key owner is required."],
    },
    name: {
      type: String,
      required: [true, "API key name is required."],
      trim: true,
      maxlength: [80, "API key name cannot exceed 80 characters."],
    },
    keyHash: {
      type: String,
      required: [true, "API key hash is required."],
      select: false,
    },
    prefix: {
      type: String,
      required: [true, "API key prefix is required."],
      trim: true,
      maxlength: [24, "API key prefix cannot exceed 24 characters."],
    },
    scopes: {
      type: [String],
      default: ["urls:read", "urls:write", "analytics:read"],
    },
    lastUsedAt: {
      type: Date,
    },
    revokedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

apiKeySchema.index({ user: 1, createdAt: -1 });
apiKeySchema.index({ keyHash: 1 }, { unique: true });
apiKeySchema.index({ prefix: 1 });

apiKeySchema.statics.generatePlainKey = function generatePlainKey() {
  return `sk_shortly_${crypto.randomBytes(24).toString("base64url")}`;
};

apiKeySchema.statics.hashPlainKey = function hashPlainKey(plainKey) {
  return hashToken(plainKey);
};

apiKeySchema.statics.prefixForKey = function prefixForKey(plainKey) {
  return plainKey.slice(0, 18);
};

const APIKey = models.APIKey ?? model("APIKey", apiKeySchema);

export default APIKey;
