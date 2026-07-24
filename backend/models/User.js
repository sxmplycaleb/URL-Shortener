import mongoose from "mongoose";

import { comparePassword as comparePasswordHash, hashPassword as hashPasswordValue } from "../utils/password.js";
import {
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  USER_ROLES,
  isStrongEnoughPassword,
  isValidEmail,
} from "../utils/validators.js";
import { isValidPhoneNumber } from "../utils/phone.js";

const { Schema, model, models } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      minlength: [MIN_NAME_LENGTH, `Name must be at least ${MIN_NAME_LENGTH} characters.`],
      maxlength: [MAX_NAME_LENGTH, `Name cannot exceed ${MAX_NAME_LENGTH} characters.`],
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      lowercase: true,
      trim: true,
      maxlength: [MAX_EMAIL_LENGTH, `Email cannot exceed ${MAX_EMAIL_LENGTH} characters.`],
      validate: {
        validator: isValidEmail,
        message: "Email must be a valid email address.",
      },
    },
    password: {
      type: String,
      required: [
        function passwordRequired() {
          return this.provider !== "google";
        },
        "Password is required.",
      ],
      minlength: [MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`],
      maxlength: [MAX_PASSWORD_LENGTH, `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters.`],
      select: false,
      validate: {
        validator(value) {
          if (!value) {
            return true;
          }

          return this.isModified("password") ? isStrongEnoughPassword(value) : true;
        },
        message: "Password must include uppercase, lowercase, number, and special characters.",
      },
    },
    googleId: {
      type: String,
      trim: true,
      maxlength: [128, "Google account identifier cannot exceed 128 characters."],
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator(value) {
          return !value || isValidPhoneNumber(value);
        },
        message: "Phone must be a valid E.164 phone number.",
      },
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    provider: {
      type: String,
      enum: {
        values: ["email", "google"],
        message: "Provider must be either email or google.",
      },
      default: "email",
    },
    role: {
      type: String,
      enum: {
        values: USER_ROLES,
        message: "Role must be either user or admin.",
      },
      default: "user",
    },
    avatar: {
      type: String,
      trim: true,
      maxlength: [512, "Avatar URL cannot exceed 512 characters."],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    googleLinkedAt: {
      type: Date,
    },
    lastLogin: {
      type: Date,
    },
    accountSettings: {
      notificationsEnabled: {
        type: Boolean,
        default: true,
      },
      emailOtpEnabled: {
        type: Boolean,
        default: true,
      },
      smsOtpEnabled: {
        type: Boolean,
        default: false,
      },
    },
    passwordResetTokenHash: {
      type: String,
      select: false,
    },
    passwordResetExpiresAt: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_document, returnedObject) {
        delete returnedObject.password;
        return returnedObject;
      },
    },
  },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ passwordResetTokenHash: 1 }, { sparse: true });

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) {
    return;
  }

  this.password = await hashPasswordValue(this.password);
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return comparePasswordHash(candidatePassword, this.password);
};

userSchema.virtual("urls", {
  ref: "URL",
  localField: "_id",
  foreignField: "user",
});

const User = models.User ?? model("User", userSchema);

export default User;
