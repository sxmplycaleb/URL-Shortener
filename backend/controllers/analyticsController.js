import { getUrlAnalytics } from "../services/analyticsService.js";

export async function getByUrlId(request, response) {
  const analytics = await getUrlAnalytics(request.user._id, request.params.urlId);
  response.json({ analytics });
}
