import { Router } from "express";

import { create, getById, list, remove, update } from "../controllers/urlController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateCreateUrl, validateUpdateUrl } from "../middleware/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(asyncHandler(requireAuth));

router.post("/", validateCreateUrl, asyncHandler(create));
router.get("/", asyncHandler(list));
router.get("/:id", asyncHandler(getById));
router.put("/:id", validateUpdateUrl, asyncHandler(update));
router.delete("/:id", asyncHandler(remove));

export default router;
