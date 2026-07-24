import mongoose from "mongoose";

import { generateShortCode } from "../utils/shortCode.js";
import {
  MAX_ALIAS_LENGTH,
  MAX_SHORT_CODE_LENGTH,
  MAX_URL_LENGTH,
  MIN_SHORT_CODE_LENGTH,
  isCustomAlias,
  isHttpUrl,
  isShortCode,
} from "../utils/validators.js";

const { Schema, model, models } = mongoose;

const urlSchema = new Schema(
  {
    originalUrl: {
      type: String,
      required: [true, "Original URL is required."],
      trim: true,
      maxlength: [MAX_URL_LENGTH, `Original URL cannot exceed ${MAX_URL_LENGTH} characters.`],
      validate: {
        validator: isHttpUrl,
        message: "Original URL must be a valid http or https URL.",
      },
    },
    shortCode: {
      type: String,
      required: [true, "Short code is required."],
      trim: true,
      minlength: [MIN_SHORT_CODE_LENGTH, `Short code must be at least ${MIN_SHORT_CODE_LENGTH} characters.`],
      maxlength: [MAX_SHORT_CODE_LENGTH, `Short code cannot exceed ${MAX_SHORT_CODE_LENGTH} characters.`],
      validate: {
        validator: isShortCode,
        message: "Short code may only contain letters, numbers, underscores, and hyphens.",
      },
    },
    customAlias: {
      type: String,
      trim: true,
      maxlength: [MAX_ALIAS_LENGTH, `Custom alias cannot exceed ${MAX_ALIAS_LENGTH} characters.`],
      validate: {
        validator(value) {
          return value == null || value === "" || isCustomAlias(value);
        },
        message: "Custom alias must start with a letter or number and only contain letters, numbers, underscores, and hyphens.",
      },
    },
    title: {
      type: String,
      trim: true,
      maxlength: [140, "Title cannot exceed 140 characters."],
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "URL owner is required."],
    },
    clickCount: {
      type: Number,
      default: 0,
      min: [0, "Click count cannot be negative."],
    },
    expiresAt: {
      type: Date,
      validate: {
        validator(value) {
          return value == null || value > new Date();
        },
        message: "Expiration date must be in the future.",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    hasQrCode: {
      type: Boolean,
      default: false,
    },
    shareCount: {
      type: Number,
      default: 0,
      min: [0, "Share count cannot be negative."],
    },
    lastClickedAt: {
      type: Date,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

urlSchema.index({ shortCode: 1 }, { unique: true });
urlSchema.index({ customAlias: 1 }, { unique: true, sparse: true });
urlSchema.index({ user: 1, createdAt: -1 });
urlSchema.index({ user: 1, isFavorite: 1, isArchived: 1 });
urlSchema.index({ createdAt: -1 });
urlSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: "date" } } });
urlSchema.index({ isActive: 1, expiresAt: 1 });

urlSchema.pre("validate", function assignShortCode() {
  if (!this.shortCode) {
    this.shortCode = generateShortCode();
  }
});

urlSchema.methods.isExpired = function isExpired(referenceDate = new Date()) {
  return Boolean(this.expiresAt && this.expiresAt <= referenceDate);
};

urlSchema.methods.incrementClicks = function incrementClicks(session) {
  this.clickCount += 1;
  return this.save({ session });
};

urlSchema.virtual("clicks", {
  ref: "Click",
  localField: "_id",
  foreignField: "url",
});

const URLModel = models.URL ?? model("URL", urlSchema);

export default URLModel;
