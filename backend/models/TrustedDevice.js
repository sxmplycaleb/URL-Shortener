import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const trustedDeviceSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fingerprintHash: {
      type: String,
      required: true,
      trim: true,
      maxlength: [64, "Fingerprint hash cannot exceed 64 characters."],
    },
    device: {
      type: String,
      trim: true,
      maxlength: [80, "Device cannot exceed 80 characters."],
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
    ipAddress: {
      type: String,
      trim: true,
      maxlength: [64, "IP address cannot exceed 64 characters."],
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

trustedDeviceSchema.index({ user: 1, fingerprintHash: 1 }, { unique: true });
trustedDeviceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const TrustedDevice = models.TrustedDevice ?? model("TrustedDevice", trustedDeviceSchema);

export default TrustedDevice;
