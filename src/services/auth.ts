import { apiRequest } from "@/services/api";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
  accountSettings?: {
    notificationsEnabled: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export function registerUser(body: RegisterRequest) {
  return apiRequest<AuthResponse, RegisterRequest>("/api/auth/register", body);
}

export function loginUser(body: LoginRequest) {
  return apiRequest<AuthResponse, LoginRequest>("/api/auth/login", body);
}

export function logoutUser() {
  return apiRequest<void, Record<string, never>>("/api/auth/logout", {});
}
