import { describe, expect, it } from "vitest";

import { ApiError } from "@/services/api";
import { getGoogleAuthErrorMessage } from "@/services/googleAuthErrors";

describe("getGoogleAuthErrorMessage", () => {
  it("asks the user to retry when the Google popup closes", () => {
    expect(getGoogleAuthErrorMessage({ code: "auth/popup-closed-by-user" })).toBe(
      "Google popup closed. Choose Continue with Google to try again.",
    );
    expect(getGoogleAuthErrorMessage({ code: "auth/cancelled-popup-request" })).toBe(
      "Google popup closed. Choose Continue with Google to try again.",
    );
  });

  it("returns friendly messages for network and configuration errors", () => {
    expect(getGoogleAuthErrorMessage({ code: "auth/network-request-failed" })).toBe(
      "Network error during Google sign-in. Check your connection and try again.",
    );
    expect(getGoogleAuthErrorMessage(new Error("Missing Firebase configuration: apiKey."))).toBe(
      "Google sign-in is not configured for this environment.",
    );
  });

  it("uses sanitized backend Google token errors", () => {
    expect(getGoogleAuthErrorMessage(new ApiError("Google sign-in could not be verified. Please try again.", 401))).toBe(
      "Google sign-in could not be verified. Please try again.",
    );
  });
});
