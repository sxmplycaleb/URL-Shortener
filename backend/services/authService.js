import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { issueTokenPair, revokeRefreshToken, rotateRefreshToken } from "./tokenService.js";

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    accountSettings: {
      notificationsEnabled: user.accountSettings?.notificationsEnabled ?? true,
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function registerUser({ name, email, password }) {
  try {
    const user = await User.create({ name, email, password });
    const tokens = await issueTokenPair(user);

    return {
      user: publicUser(user),
      ...tokens,
    };
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError("An account with that email already exists.", 409);
    }

    throw error;
  }
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email: email?.trim().toLowerCase() }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Invalid email or password.", 401);
  }

  const tokens = await issueTokenPair(user);

  return {
    user: publicUser(user),
    ...tokens,
  };
}

export async function refreshAuth(refreshToken) {
  const payload = await rotateRefreshToken(refreshToken);

  return {
    user: publicUser(payload.user),
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  };
}

export function logoutUser(refreshToken) {
  return revokeRefreshToken(refreshToken);
}

export function publicUserResource(user) {
  return publicUser(user);
}
