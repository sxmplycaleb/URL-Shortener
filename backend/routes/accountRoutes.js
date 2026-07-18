import { Router } from "express";

import { changePassword, removeMe, updateAccountSettings, updateMe } from "../controllers/accountController.js";
import { requireAuth } from "../middleware/auth.js";
import { createPasswordRateLimiter } from "../middleware/rateLimit.js";
import { validateUpdateAccountSettings, validateUpdatePassword, validateUpdateProfile } from "../middleware/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
const passwordRateLimiter = createPasswordRateLimiter();

router.use(asyncHandler(requireAuth));
router.put("/me", validateUpdateProfile, asyncHandler(updateMe));
router.put("/me/password", passwordRateLimiter, validateUpdatePassword, asyncHandler(changePassword));
router.put("/me/settings", validateUpdateAccountSettings, asyncHandler(updateAccountSettings));
router.delete("/me", asyncHandler(removeMe));

export default router;
