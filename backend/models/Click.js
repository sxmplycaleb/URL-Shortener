import mongoose from "mongoose";

import { hashIpAddress } from "../utils/hash.js";

const { Schema, model, models } = mongoose;

const clickSchema = new Schema(
  {
    url: {
      type: Schema.Types.ObjectId,
      ref: "URL",
      required: [true, "URL reference is required."],
    },
    ipHash: {
      type: String,
      trim: true,
      maxlength: [128, "IP hash cannot exceed 128 characters."],
    },
    browser: {
      type: String,
      trim: true,
      maxlength: [80, "Browser cannot exceed 80 characters."],
    },
    operatingSystem: {
      type: String,
      trim: true,
      maxlength: [80, "Operating system cannot exceed 80 characters."],
    },
    device: {
      type: String,
      trim: true,
      maxlength: [80, "Device cannot exceed 80 characters."],
    },
    country: {
      type: String,
      trim: true,
      maxlength: [80, "Country cannot exceed 80 characters."],
    },
    city: {
      type: String,
      trim: true,
      maxlength: [120, "City cannot exceed 120 characters."],
    },
    referrer: {
      type: String,
      trim: true,
      maxlength: [512, "Referrer cannot exceed 512 characters."],
    },
    clickedAt: {
      type: Date,
      default: Date.now,
      required: [true, "Click timestamp is required."],
    },
  },
  {
    timestamps: false,
  },
);

clickSchema.index({ url: 1, clickedAt: -1 });
clickSchema.index({ clickedAt: -1 });
clickSchema.index({ country: 1, city: 1 });
clickSchema.index({ browser: 1 });
clickSchema.index({ operatingSystem: 1 });

clickSchema.virtual("visitorIp").set(function setVisitorIp(ipAddress) {
  this.ipHash = hashIpAddress(ipAddress);
});

const Click = models.Click ?? model("Click", clickSchema);

export default Click;
