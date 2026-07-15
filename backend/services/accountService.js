import Click from "../models/Click.js";
import RefreshToken from "../models/RefreshToken.js";
import URLModel from "../models/URL.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { publicUserResource } from "./authService.js";

export async function updateProfile(userId, { name, email }) {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { name, email },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!user) {
      throw new AppError("Authenticated user no longer exists.", 401);
    }

    return publicUserResource(user);
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError("An account with that email already exists.", 409);
    }

    throw error;
  }
}

export async function updatePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select("+password");

  if (!user) {
    throw new AppError("Authenticated user no longer exists.", 401);
  }

  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError("Current password is incorrect.", 400);
  }

  user.password = newPassword;
  await user.save();

  return publicUserResource(user);
}

export async function deleteAccount(userId) {
  const urls = await URLModel.find({ user: userId }).select("_id");
  const urlIds = urls.map((url) => url._id);

  await Promise.all([
    Click.deleteMany({ url: { $in: urlIds } }),
    URLModel.deleteMany({ user: userId }),
    RefreshToken.deleteMany({ user: userId }),
    User.deleteOne({ _id: userId }),
  ]);
}
