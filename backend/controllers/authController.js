import { loginUser, logoutUser, refreshAuth, registerUser } from "../services/authService.js";

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
  path: "/api/auth",
};

function sendAuthResponse(response, statusCode, payload) {
  response.cookie("refreshToken", payload.refreshToken, REFRESH_COOKIE_OPTIONS);
  response.status(statusCode).json({
    user: payload.user,
    accessToken: payload.accessToken,
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

export async function refresh(request, response) {
  const payload = await refreshAuth(request.validatedBody.refreshToken);
  sendAuthResponse(response, 200, payload);
}

export async function logout(request, response) {
  await logoutUser(request.validatedBody.refreshToken);
  response.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
  response.status(204).send();
}
