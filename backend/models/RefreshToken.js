import mongoose from "mongoose";

import { hashToken, isSha256Hash } from "../utils/hash.js";
import { MAX_TOKEN_LENGTH } from "../utils/validators.js";

const { Schema, model, models } = mongoose;

const refreshTokenSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Refresh token owner is required."],
    },
    tokenHash: {
      type: String,
      required: [true, "Token hash is required."],
      trim: true,
      maxlength: [MAX_TOKEN_LENGTH, `Token hash cannot exceed ${MAX_TOKEN_LENGTH} characters.`],
    },
    expiresAt: {
      type: Date,
      required: [true, "Token expiry date is required."],
      validate: {
        validator(value) {
          return value > new Date();
        },
        message: "Token expiry date must be in the future.",
      },
    },
    revoked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

refreshTokenSchema.index({ tokenHash: 1 }, { unique: true });
refreshTokenSchema.index({ user: 1, revoked: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ createdAt: -1 });

refreshTokenSchema.pre("validate", function hashPlainToken() {
  if (this.isModified("tokenHash") && !isSha256Hash(this.tokenHash)) {
    this.tokenHash = hashToken(this.tokenHash);
  }
});

refreshTokenSchema.methods.revoke = function revoke(session) {
  this.revoked = true;
  return this.save({ session });
};

refreshTokenSchema.methods.isExpired = function isExpired(referenceDate = new Date()) {
  return this.expiresAt <= referenceDate;
};

refreshTokenSchema.statics.hashToken = hashToken;

const RefreshToken = models.RefreshToken ?? model("RefreshToken", refreshTokenSchema);

export default RefreshToken;
