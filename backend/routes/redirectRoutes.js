import { Router } from "express";

import { redirect } from "../controllers/redirectController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/:shortCode", asyncHandler(redirect));

export default router;
