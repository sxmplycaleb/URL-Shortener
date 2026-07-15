import { Router } from "express";

import { login, logout, refresh, register } from "../controllers/authController.js";
import { createAuthRateLimiter } from "../middleware/rateLimit.js";
import { validateLogin, validateRefreshOrLogout, validateRegister } from "../middleware/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
const authRateLimiter = createAuthRateLimiter();

router.post("/register", authRateLimiter, validateRegister, asyncHandler(register));
router.post("/login", authRateLimiter, validateLogin, asyncHandler(login));
router.post("/refresh", authRateLimiter, validateRefreshOrLogout, asyncHandler(refresh));
router.post("/logout", validateRefreshOrLogout, asyncHandler(logout));

export default router;
