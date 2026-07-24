import { Router } from "express";

import { getSecurity, removeOtherSessions, removeSession, updateSettings } from "../controllers/securityController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateRevokeSession, validateUpdateSecuritySettings } from "../middleware/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(asyncHandler(requireAuth));
router.get("/", asyncHandler(getSecurity));
router.delete("/sessions/others", asyncHandler(removeOtherSessions));
router.delete("/sessions/:sessionId", validateRevokeSession, asyncHandler(removeSession));
router.put("/settings", validateUpdateSecuritySettings, asyncHandler(updateSettings));

export default router;
