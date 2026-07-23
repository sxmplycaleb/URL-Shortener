import { Router } from "express";

import { forgotPassword, login, logout, refresh, register, resetForgottenPassword } from "../controllers/authController.js";
import { createAuthRateLimiter, createPasswordRateLimiter } from "../middleware/rateLimit.js";
import {
  validateForgotPassword,
  validateLogin,
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
router.post("/refresh", authRateLimiter, validateRefreshOrLogout, asyncHandler(refresh));
router.post("/logout", validateRefreshOrLogout, asyncHandler(logout));
router.post("/forgot-password", passwordRateLimiter, validateForgotPassword, asyncHandler(forgotPassword));
router.post("/reset-password", passwordRateLimiter, validateResetPassword, asyncHandler(resetForgottenPassword));

export default router;
