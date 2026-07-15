import { authenticatedApiRequest } from "@/services/api";

export type AnalyticsPeriod = "7d" | "30d";
export type AnalyticsStatus = "active" | "expired" | "blocked";
export type AnalyticsSummaryIcon = "clicks" | "links" | "active" | "growth";

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

export interface AnalyticsDashboardData {
  summary: AnalyticsSummaryCard[];
  clickActivity: Record<AnalyticsPeriod, ClickActivityPoint[]>;
  devices: DeviceAnalyticsItem[];
  browsers: BrowserAnalyticsItem[];
  locations: LocationAnalyticsItem[];
  links: LinkAnalyticsItem[];
}

interface AnalyticsDashboardResponse {
  analytics: AnalyticsDashboardData;
}

export async function getAnalyticsDashboard(accessToken: string): Promise<AnalyticsDashboardData> {
  const response = await authenticatedApiRequest<AnalyticsDashboardResponse>("/api/analytics", { accessToken });
  return response.analytics;
}
