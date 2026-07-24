import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

export const OTP_PURPOSES = ["LOGIN", "REGISTER", "RESET_PASSWORD", "CHANGE_EMAIL", "CHANGE_PHONE"];

const otpSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    default: null,
  },
  phone: {
    type: String,
    trim: true,
    default: null,
  },
  purpose: {
    type: String,
    enum: {
      values: OTP_PURPOSES,
      message: "OTP purpose is invalid.",
    },
    required: [true, "OTP purpose is required."],
  },
  hashedOtp: {
    type: String,
    required: [true, "Hashed OTP is required."],
    select: false,
  },
  expiresAt: {
    type: Date,
    required: [true, "OTP expiry is required."],
  },
  attempts: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  used: {
    type: Boolean,
    default: false,
  },
  verifiedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
});

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ email: 1, purpose: 1, used: 1, createdAt: -1 });
otpSchema.index({ phone: 1, purpose: 1, used: 1, createdAt: -1 });
otpSchema.index({ userId: 1, purpose: 1, used: 1, createdAt: -1 });

const OTP = models.OTP ?? model("OTP", otpSchema);

export default OTP;
