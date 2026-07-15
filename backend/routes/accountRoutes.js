import { Router } from "express";

import { changePassword, removeMe, updateMe } from "../controllers/accountController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateUpdatePassword, validateUpdateProfile } from "../middleware/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(asyncHandler(requireAuth));
router.put("/me", validateUpdateProfile, asyncHandler(updateMe));
router.put("/me/password", validateUpdatePassword, asyncHandler(changePassword));
router.delete("/me", asyncHandler(removeMe));

export default router;
