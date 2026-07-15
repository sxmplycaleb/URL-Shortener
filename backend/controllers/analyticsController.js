import { getDashboardAnalytics, getUrlAnalytics } from "../services/analyticsService.js";

export async function getDashboard(request, response) {
  const analytics = await getDashboardAnalytics(request.user._id);
  response.json({ analytics });
}

export async function getByUrlId(request, response) {
  const analytics = await getUrlAnalytics(request.user._id, request.params.urlId);
  response.json({ analytics });
}
