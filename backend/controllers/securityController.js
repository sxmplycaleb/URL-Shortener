import {
  getSecurityCenter,
  revokeOtherSessions,
  revokeSession,
  updateSecuritySettings,
} from "../services/securityService.js";
import { getRefreshCookieOptions } from "./authController.js";

function refreshTokenFromRequest(request) {
  return request.cookies?.refreshToken;
}

export async function getSecurity(request, response) {
  const payload = await getSecurityCenter(request.user._id, refreshTokenFromRequest(request));
  response.json(payload);
}

export async function removeSession(request, response) {
  const payload = await revokeSession(request.user._id, request.params.sessionId, {
    refreshToken: refreshTokenFromRequest(request),
    confirmCurrent: request.validatedBody.confirmCurrent,
  });

  if (payload.revokedCurrent) {
    response.clearCookie("refreshToken", getRefreshCookieOptions());
  }

  response.json(payload);
}

export async function removeOtherSessions(request, response) {
  const payload = await revokeOtherSessions(request.user._id, refreshTokenFromRequest(request));
  response.json(payload);
}

export async function updateSettings(request, response) {
  const user = await updateSecuritySettings(request.user._id, request.validatedBody);
  response.json({ user });
}
