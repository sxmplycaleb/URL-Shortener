import { Router } from "express";

import { redirect } from "../controllers/redirectController.js";
import { createRedirectRateLimiter } from "../middleware/rateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
const redirectRateLimiter = createRedirectRateLimiter();

router.get("/:shortCode", redirectRateLimiter, asyncHandler(redirect));

export default router;
