import { Router } from "express";

import {
  getSecurity,
  listLoginHistory,
  listSessions,
  listTrustedDevices,
  removeOtherSessions,
  removeSession,
  removeTrusted,
  updateSettings,
} from "../controllers/securityController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateRevokeSession, validateUpdateSecuritySettings } from "../middleware/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(asyncHandler(requireAuth));
router.get("/", asyncHandler(getSecurity));
router.get("/sessions", asyncHandler(listSessions));
router.delete("/sessions", asyncHandler(removeOtherSessions));
router.delete("/sessions/others", asyncHandler(removeOtherSessions));
router.delete("/sessions/:sessionId", validateRevokeSession, asyncHandler(removeSession));
router.get("/trusted-devices", asyncHandler(listTrustedDevices));
router.delete("/trusted-devices/:deviceId", asyncHandler(removeTrusted));
router.get("/login-history", asyncHandler(listLoginHistory));
router.put("/settings", validateUpdateSecuritySettings, asyncHandler(updateSettings));

export default router;
