import { getApiErrorMessage } from "@/services/api";

export function getGoogleAuthErrorMessage(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";

  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return "Google popup closed. Choose Continue with Google to try again.";
  }

  if (code === "auth/network-request-failed") {
    return "Network error during Google sign-in. Check your connection and try again.";
  }

  if (code === "auth/user-disabled") {
    return "This Google account is disabled. Contact support if this seems wrong.";
  }

  if (error instanceof Error && error.message.startsWith("Missing Firebase configuration")) {
    return "Google sign-in is not configured for this environment.";
  }

  return getApiErrorMessage(error, "Google sign-in is unavailable right now. Please try again.");
}
