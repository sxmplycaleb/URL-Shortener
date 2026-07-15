import { findUserFromAccessToken } from "../services/tokenService.js";
import AppError from "../utils/AppError.js";

export async function requireAuth(request, _response, next) {
  const authorizationHeader = request.get("authorization");

  if (!authorizationHeader?.startsWith("Bearer ")) {
    next(new AppError("Authentication required.", 401));
    return;
  }

  try {
    request.user = await findUserFromAccessToken(authorizationHeader.slice("Bearer ".length));
    next();
  } catch (error) {
    next(error);
  }
}
