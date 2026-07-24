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
  phone?: string;
  phoneVerified?: boolean;
  lastLogin?: string;
  authProviders?: {
    email: boolean;
    google: boolean;
    googleLinkedAt?: string;
    phone?: boolean;
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
  phone?: string;
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

export type OtpPurpose = "LOGIN" | "REGISTER" | "RESET_PASSWORD";
// TODO: Re-enable when Meta WhatsApp Cloud API integration is implemented.
// export type PhoneOtpChannel = "sms" | "whatsapp";
export type PhoneOtpChannel = "sms";

export interface OtpRequest {
  email: string;
  purpose: OtpPurpose;
  channel?: "email";
}

export interface PhoneOtpRequest {
  phone: string;
  purpose: OtpPurpose;
  channel: PhoneOtpChannel;
}

export interface OtpRequestResponse {
  otpId: string;
  expiresAt: string;
  // TODO: Re-enable when Meta WhatsApp Cloud API integration is implemented.
  // channel: "email" | "sms" | "whatsapp";
  channel: "email" | "sms";
  delivery: {
    provider: string;
    delivered: boolean;
  };
  otp?: string;
}

export interface OtpVerifyRequest extends OtpRequest {
  otp: string;
  rememberDevice?: boolean;
}

export interface PhoneOtpVerifyRequest extends PhoneOtpRequest {
  otp: string;
  rememberDevice?: boolean;
}

export interface OtpVerifyResponse {
  verified: true;
  otpId: string;
  userId: string | null;
  email?: string;
  phone?: string;
  purpose: OtpPurpose;
  message?: string;
  resetUrl?: string;
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

export function requestEmailOtp(body: OtpRequest) {
  return apiRequest<OtpRequestResponse, OtpRequest>("/api/auth/otp/request", { ...body, channel: "email" });
}

export function verifyEmailOtp(body: OtpVerifyRequest) {
  return apiRequest<AuthResponse | OtpVerifyResponse, OtpVerifyRequest>("/api/auth/otp/verify", body);
}

export function requestPhoneOtp(body: PhoneOtpRequest) {
  return apiRequest<OtpRequestResponse, PhoneOtpRequest>("/api/auth/phone/request", body);
}

export function verifyPhoneOtp(body: PhoneOtpVerifyRequest) {
  return apiRequest<AuthResponse | OtpVerifyResponse, PhoneOtpVerifyRequest>("/api/auth/phone/verify", body);
}
