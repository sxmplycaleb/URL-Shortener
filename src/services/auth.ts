import { apiRequest } from "@/services/api";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
  emailVerified: boolean;
  provider: "email" | "google";
  avatar?: string;
  lastLogin?: string;
  authProviders?: {
    email: boolean;
    google: boolean;
    googleLinkedAt?: string;
  };
  accountSettings?: {
    notificationsEnabled: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  expiresIn: string;
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

export interface GoogleLoginRequest {
  idToken: string;
}

export interface ForgotPasswordResponse {
  message: string;
  resetUrl?: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export function registerUser(body: RegisterRequest) {
  return apiRequest<AuthResponse, RegisterRequest>("/api/auth/register", body);
}

export function loginUser(body: LoginRequest) {
  return apiRequest<AuthResponse, LoginRequest>("/api/auth/login", body);
}

export function loginWithGoogle(body: GoogleLoginRequest) {
  return apiRequest<AuthResponse, GoogleLoginRequest>("/api/auth/google", body);
}

export function logoutUser() {
  return apiRequest<void, Record<string, never>>("/api/auth/logout", {});
}

export function requestPasswordReset(body: Pick<LoginRequest, "email">) {
  return apiRequest<ForgotPasswordResponse, Pick<LoginRequest, "email">>("/api/auth/forgot-password", body);
}

export function resetPassword(body: ResetPasswordRequest) {
  return apiRequest<ForgotPasswordResponse, ResetPasswordRequest>("/api/auth/reset-password", body);
}
