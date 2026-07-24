import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const apiUsageSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "API usage owner is required."],
    },
    apiKey: {
      type: Schema.Types.ObjectId,
      ref: "APIKey",
    },
    method: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10,
    },
    path: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },
    statusCode: {
      type: Number,
      min: 100,
      max: 599,
    },
    durationMs: {
      type: Number,
      min: 0,
    },
    usedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  },
);

apiUsageSchema.index({ user: 1, usedAt: -1 });
apiUsageSchema.index({ apiKey: 1, usedAt: -1 });
apiUsageSchema.index({ usedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

const APIUsage = models.APIUsage ?? model("APIUsage", apiUsageSchema);

export default APIUsage;
