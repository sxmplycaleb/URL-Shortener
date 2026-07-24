import { getDashboardAnalytics, getUrlAnalytics } from "../services/analyticsService.js";
import { exportAnalytics, sendExport } from "../services/exportService.js";

export async function getDashboard(request, response) {
  const analytics = await getDashboardAnalytics(request.user._id);
  response.json({ analytics });
}

export async function getByUrlId(request, response) {
  const analytics = await getUrlAnalytics(request.user._id, request.params.urlId);
  response.json({ analytics });
}

export async function exportDashboard(request, response) {
  sendExport(response, await exportAnalytics(request.user._id, request.query.format));
}
