import { deleteAccount, updatePassword, updateProfile } from "../services/accountService.js";
import { REFRESH_COOKIE_OPTIONS } from "./authController.js";

export async function updateMe(request, response) {
  const user = await updateProfile(request.user._id, request.validatedBody);
  response.json({ user });
}

export async function changePassword(request, response) {
  const user = await updatePassword(request.user._id, request.validatedBody);
  response.json({ user });
}

export async function removeMe(request, response) {
  await deleteAccount(request.user._id);
  response.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
  response.status(204).send();
}
