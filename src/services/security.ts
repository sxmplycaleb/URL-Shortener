import { authenticatedApiRequest } from "@/services/api";
import type { AuthUser } from "@/services/auth";

export type LoginMethod = "email_password" | "email_otp" | "sms_otp" | "google";
export type LoginStatus = "success" | "failed";

export interface SecuritySession {
  id: string;
  browser: string;
  device: string;
  operatingSystem: string;
  ipAddress: string;
  country: string | null;
  lastActiveAt: string;
  createdAt: string;
  current: boolean;
}

export interface LoginHistoryEntry {
  id: string;
  status: LoginStatus;
  method: LoginMethod;
  timestamp: string;
  device: string;
  ipAddress: string;
  browser: string;
  operatingSystem: string;
}

export interface TrustedDevice {
  id: string;
  device: string;
  browser: string;
  operatingSystem: string;
  ipAddress: string;
  lastUsedAt: string;
  expiresAt: string;
}

export interface SecuritySettings {
  emailOtpEnabled: boolean;
  smsOtpEnabled: boolean;
  googleLinked: boolean;
  googleLinkedAt: string | null;
  hasPassword: boolean;
  phoneVerified: boolean;
}

export interface SecurityCenterResponse {
  sessions: SecuritySession[];
  loginHistory: LoginHistoryEntry[];
  trustedDevices: TrustedDevice[];
  securitySettings: SecuritySettings;
}

interface AccountResponse {
  user: AuthUser;
}

export function getSecurityCenter(accessToken: string) {
  return authenticatedApiRequest<SecurityCenterResponse>("/api/security", {
    method: "GET",
    accessToken,
  });
}

export function revokeSession(accessToken: string, sessionId: string, confirmCurrent = false) {
  return authenticatedApiRequest<{ revokedCurrent: boolean }>(`/api/security/sessions/${sessionId}`, {
    method: "DELETE",
    accessToken,
    body: { confirmCurrent },
  });
}

export function revokeOtherSessions(accessToken: string) {
  return authenticatedApiRequest<{ revokedCount: number }>("/api/security/sessions/others", {
    method: "DELETE",
    accessToken,
  });
}

export function removeTrustedDevice(accessToken: string, deviceId: string) {
  return authenticatedApiRequest<void>(`/api/security/trusted-devices/${deviceId}`, {
    method: "DELETE",
    accessToken,
  });
}

export function updateSecuritySettings(accessToken: string, body: Pick<SecuritySettings, "emailOtpEnabled" | "smsOtpEnabled">) {
  return authenticatedApiRequest<AccountResponse>("/api/security/settings", {
    method: "PUT",
    accessToken,
    body,
  });
}
