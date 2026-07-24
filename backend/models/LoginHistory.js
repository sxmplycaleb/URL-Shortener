import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const loginHistorySchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      maxlength: [254, "Email cannot exceed 254 characters."],
    },
    status: {
      type: String,
      enum: ["success", "failed"],
      required: true,
    },
    method: {
      type: String,
      enum: ["email_password", "email_otp", "sms_otp", "google"],
      required: true,
    },
    device: {
      type: String,
      trim: true,
      maxlength: [80, "Device cannot exceed 80 characters."],
    },
    ipAddress: {
      type: String,
      trim: true,
      maxlength: [64, "IP address cannot exceed 64 characters."],
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
  },
  {
    timestamps: true,
  },
);

loginHistorySchema.index({ user: 1, createdAt: -1 });
loginHistorySchema.index({ createdAt: -1 });

const LoginHistory = models.LoginHistory ?? model("LoginHistory", loginHistorySchema);

export default LoginHistory;
