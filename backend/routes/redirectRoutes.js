import { Router } from "express";

import { redirect, unlockRedirect } from "../controllers/redirectController.js";
import { createRedirectRateLimiter } from "../middleware/rateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
const redirectRateLimiter = createRedirectRateLimiter();

router.get("/:shortCode", redirectRateLimiter, asyncHandler(redirect));
router.post("/:shortCode", redirectRateLimiter, asyncHandler(unlockRedirect));

export default router;
