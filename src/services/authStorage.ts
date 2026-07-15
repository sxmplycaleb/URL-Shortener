import type { AuthResponse } from "@/services/auth";

const AUTH_SESSION_KEY = "shortly.auth";

interface StoredAuthSession {
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

export function clearAuthSession() {
  window.sessionStorage.removeItem(AUTH_SESSION_KEY);
}
