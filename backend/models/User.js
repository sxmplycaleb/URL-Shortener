import mongoose from "mongoose";

import { comparePassword as comparePasswordHash, hashPassword as hashPasswordValue } from "../utils/password.js";
import {
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  USER_ROLES,
  isStrongEnoughPassword,
  isValidEmail,
} from "../utils/validators.js";

const { Schema, model, models } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      minlength: [2, "Name must be at least 2 characters."],
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
      required: [true, "Password is required."],
      minlength: [MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`],
      select: false,
      validate: {
        validator(value) {
          return this.isModified("password") ? isStrongEnoughPassword(value) : true;
        },
        message: "Password must include uppercase, lowercase, and numeric characters.",
      },
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
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

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
