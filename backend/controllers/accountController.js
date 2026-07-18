import { deleteAccount, updatePassword, updateProfile, updateSettings } from "../services/accountService.js";
import { getRefreshCookieOptions } from "./authController.js";

export async function updateMe(request, response) {
  const user = await updateProfile(request.user._id, request.validatedBody);
  response.json({ user });
}

export async function changePassword(request, response) {
  const user = await updatePassword(request.user._id, request.validatedBody);
  response.json({ user });
}

export async function updateAccountSettings(request, response) {
  const user = await updateSettings(request.user._id, request.validatedBody);
  response.json({ user });
}

export async function removeMe(request, response) {
  await deleteAccount(request.user._id);
  response.clearCookie("refreshToken", getRefreshCookieOptions());
  response.status(204).send();
}
