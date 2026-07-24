import {
  getSecurityCenter,
  getActiveSessions,
  getLoginHistory,
  getTrustedDevices,
  revokeOtherSessions,
  revokeSession,
  removeTrustedDevice,
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

export async function listSessions(request, response) {
  const sessions = await getActiveSessions(request.user._id, refreshTokenFromRequest(request));
  response.json({ sessions });
}

export async function listTrustedDevices(request, response) {
  const trustedDevices = await getTrustedDevices(request.user._id);
  response.json({ trustedDevices });
}

export async function listLoginHistory(request, response) {
  const loginHistory = await getLoginHistory(request.user._id);
  response.json({ loginHistory });
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

export async function removeTrusted(request, response) {
  await removeTrustedDevice(request.user._id, request.params.deviceId);
  response.status(204).send();
}

export async function updateSettings(request, response) {
  const user = await updateSecuritySettings(request.user._id, request.validatedBody);
  response.json({ user });
}
