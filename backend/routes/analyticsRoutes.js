import { Router } from "express";

import { getByUrlId, getDashboard } from "../controllers/analyticsController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(asyncHandler(requireAuth));
router.get("/", asyncHandler(getDashboard));
router.get("/:urlId", asyncHandler(getByUrlId));

export default router;
