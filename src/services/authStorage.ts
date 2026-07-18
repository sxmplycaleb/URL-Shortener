import type { AuthResponse } from "@/services/auth";

const AUTH_SESSION_KEY = "shortly.auth";
const AUTH_REDIRECT_MESSAGE_KEY = "shortly.auth.redirectMessage";

export interface StoredAuthSession {
  accessToken: string;
  user: AuthResponse["user"];
}

export function saveAuthSession(session: StoredAuthSession) {
  window.sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function getAuthSession(): StoredAuthSession | null {
  const stored = window.sessionStorage.getItem(AUTH_SESSION_KEY);

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as StoredAuthSession;
  } catch {
    window.sessionStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
}

export function clearAuthSession(redirectMessage?: string) {
  window.sessionStorage.removeItem(AUTH_SESSION_KEY);

  if (redirectMessage) {
    window.sessionStorage.setItem(AUTH_REDIRECT_MESSAGE_KEY, redirectMessage);
  }
}

export function consumeAuthRedirectMessage() {
  const message = window.sessionStorage.getItem(AUTH_REDIRECT_MESSAGE_KEY);
  window.sessionStorage.removeItem(AUTH_REDIRECT_MESSAGE_KEY);
  return message;
}
