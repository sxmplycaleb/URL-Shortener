import { Router } from "express";

import {
  forgotPassword,
  googleLogin,
  login,
  logout,
  refresh,
  register,
  requestOtp,
  resetForgottenPassword,
  verifyOtp,
} from "../controllers/authController.js";
import { createAuthRateLimiter, createPasswordRateLimiter } from "../middleware/rateLimit.js";
import {
  validateForgotPassword,
  validateGoogleLogin,
  validateLogin,
  validateOtpRequest,
  validateOtpVerification,
  validateRefreshOrLogout,
  validateRegister,
  validateResetPassword,
} from "../middleware/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
const authRateLimiter = createAuthRateLimiter();
const passwordRateLimiter = createPasswordRateLimiter();

router.post("/register", authRateLimiter, validateRegister, asyncHandler(register));
router.post("/login", authRateLimiter, validateLogin, asyncHandler(login));
router.post("/google", authRateLimiter, validateGoogleLogin, asyncHandler(googleLogin));
router.post("/refresh", authRateLimiter, validateRefreshOrLogout, asyncHandler(refresh));
router.post("/logout", validateRefreshOrLogout, asyncHandler(logout));
router.post("/forgot-password", passwordRateLimiter, validateForgotPassword, asyncHandler(forgotPassword));
router.post("/reset-password", passwordRateLimiter, validateResetPassword, asyncHandler(resetForgottenPassword));
router.post("/otp/request", authRateLimiter, validateOtpRequest, asyncHandler(requestOtp));
router.post("/otp/verify", authRateLimiter, validateOtpVerification, asyncHandler(verifyOtp));

export default router;
