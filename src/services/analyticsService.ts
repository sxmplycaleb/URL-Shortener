import { authenticatedApiRequest } from "@/services/api";

export type AnalyticsPeriod = "7d" | "30d";
export type AnalyticsStatus = "active" | "expired" | "blocked";
export type AnalyticsSummaryIcon = "clicks" | "links" | "active" | "growth";
export type ActivityPeriod = "hourly" | "daily" | "weekly" | "monthly";

export interface AnalyticsSummaryCard {
  id: string;
  title: string;
  value: string;
  trend: string;
  trendDirection: "up" | "down" | "neutral";
  icon: AnalyticsSummaryIcon;
}

export interface ClickActivityPoint {
  label: string;
  clicks: number;
}

export interface DeviceAnalyticsItem {
  name: "Desktop" | "Mobile" | "Tablet";
  value: number;
}

export interface BrowserAnalyticsItem {
  name: string;
  clicks: number;
  share: number;
}

export type BreakdownAnalyticsItem = BrowserAnalyticsItem;

export interface LocationAnalyticsItem {
  place: string;
  country: string;
  clicks: number;
  share: number;
}

export interface LinkAnalyticsItem {
  id: string;
  shortUrl: string;
  originalUrl: string;
  totalClicks: number;
  createdAt: string;
  status: AnalyticsStatus;
}

export interface TopUrlAnalyticsItem extends LinkAnalyticsItem {
  title: string;
}

export interface InsightCard {
  id: string;
  title: string;
  value: string;
  detail: string;
}

export interface AnalyticsDashboardData {
  summary: AnalyticsSummaryCard[];
  clickActivity: Record<AnalyticsPeriod, ClickActivityPoint[]>;
  activity: Record<ActivityPeriod, ClickActivityPoint[]>;
  devices: DeviceAnalyticsItem[];
  browsers: BrowserAnalyticsItem[];
  operatingSystems: BreakdownAnalyticsItem[];
  referrers: BreakdownAnalyticsItem[];
  countries: BreakdownAnalyticsItem[];
  locations: LocationAnalyticsItem[];
  topUrls: TopUrlAnalyticsItem[];
  insights: InsightCard[];
  links: LinkAnalyticsItem[];
}

interface AnalyticsDashboardResponse {
  analytics: AnalyticsDashboardData;
}

export async function getAnalyticsDashboard(accessToken: string): Promise<AnalyticsDashboardData> {
  const response = await authenticatedApiRequest<AnalyticsDashboardResponse>("/api/analytics", { accessToken });
  return response.analytics;
}

export function getAnalyticsExportUrl(format: "csv" | "excel" | "json") {
  return `/api/analytics/export?format=${encodeURIComponent(format)}`;
}
