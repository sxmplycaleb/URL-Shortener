import { Router } from "express";

import { create, docs, list, revoke, usage } from "../controllers/apiKeyController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateCreateApiKey } from "../middleware/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/docs", asyncHandler(docs));
router.use(asyncHandler(requireAuth));
router.get("/", asyncHandler(list));
router.post("/", validateCreateApiKey, asyncHandler(create));
router.get("/usage", asyncHandler(usage));
router.delete("/:id", asyncHandler(revoke));

export default router;
