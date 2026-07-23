import {
  loginUser,
  loginWithGoogle,
  logoutUser,
  refreshAuth,
  registerUser,
  requestPasswordReset,
  resetPassword,
} from "../services/authService.js";
import { getEnv } from "../config/env.js";

export function getRefreshCookieOptions() {
  const { authCookieSameSite, authCookieSecure } = getEnv();

  return {
    httpOnly: true,
    sameSite: authCookieSameSite,
    secure: authCookieSecure,
    path: "/api/auth",
  };
}

function sendAuthResponse(response, statusCode, payload) {
  const { accessTokenExpiresIn } = getEnv();

  response.cookie("refreshToken", payload.refreshToken, getRefreshCookieOptions());
  response.status(statusCode).json({
    user: payload.user,
    accessToken: payload.accessToken,
    expiresIn: accessTokenExpiresIn,
  });
}

export async function register(request, response) {
  const payload = await registerUser(request.validatedBody);
  sendAuthResponse(response, 201, payload);
}

export async function login(request, response) {
  const payload = await loginUser(request.validatedBody);
  sendAuthResponse(response, 200, payload);
}

export async function googleLogin(request, response) {
  const payload = await loginWithGoogle(request.validatedBody);
  sendAuthResponse(response, 200, payload);
}

export async function refresh(request, response) {
  const payload = await refreshAuth(request.validatedBody.refreshToken);
  sendAuthResponse(response, 200, payload);
}

export async function logout(request, response) {
  await logoutUser(request.validatedBody.refreshToken);
  response.clearCookie("refreshToken", getRefreshCookieOptions());
  response.status(204).send();
}

export async function forgotPassword(request, response) {
  const payload = await requestPasswordReset(request.validatedBody);
  response.json(payload);
}

export async function resetForgottenPassword(request, response) {
  const payload = await resetPassword(request.validatedBody);
  response.json(payload);
}
