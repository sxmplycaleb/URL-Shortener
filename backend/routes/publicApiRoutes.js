import { Router } from "express";

import { create, list } from "../controllers/urlController.js";
import { getDashboard } from "../controllers/analyticsController.js";
import { requireApiKey } from "../middleware/apiKeyAuth.js";
import { createUrlCreationRateLimiter } from "../middleware/rateLimit.js";
import { validateCreateUrl } from "../middleware/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
const urlCreationRateLimiter = createUrlCreationRateLimiter();

router.use(asyncHandler(requireApiKey));
router.get("/urls", asyncHandler(list));
router.post("/urls", urlCreationRateLimiter, validateCreateUrl, asyncHandler(create));
router.get("/analytics", asyncHandler(getDashboard));

export default router;
