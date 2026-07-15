import { authenticatedApiRequest } from "@/services/api";
import type { AuthUser } from "@/services/auth";

export interface UpdateProfileRequest {
  name: string;
  email: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

interface AccountResponse {
  user: AuthUser;
}

export function updateProfile(accessToken: string, body: UpdateProfileRequest) {
  return authenticatedApiRequest<AccountResponse>("/api/account/me", {
    method: "PUT",
    accessToken,
    body,
  });
}

export function updatePassword(accessToken: string, body: UpdatePasswordRequest) {
  return authenticatedApiRequest<AccountResponse>("/api/account/me/password", {
    method: "PUT",
    accessToken,
    body,
  });
}

export function deleteAccount(accessToken: string) {
  return authenticatedApiRequest<void>("/api/account/me", {
    method: "DELETE",
    accessToken,
  });
}
