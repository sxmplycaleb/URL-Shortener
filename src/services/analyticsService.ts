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
  locations: LocationAnalyticsItem[];
  links: LinkAnalyticsItem[];
}

const analyticsData: AnalyticsDashboardData = {
  summary: [
    {
      id: "total-clicks",
      title: "Total clicks",
      value: "29,431",
      trend: "+18.4% vs last period",
      trendDirection: "up",
      icon: "clicks",
    },
    {
      id: "total-links",
      title: "Total links created",
      value: "128",
      trend: "+12 new this month",
      trendDirection: "up",
      icon: "links",
    },
    {
      id: "active-links",
      title: "Active links",
      value: "116",
      trend: "91% of all links",
      trendDirection: "neutral",
      icon: "active",
    },
    {
      id: "click-growth",
      title: "Click growth",
      value: "18.4%",
      trend: "+4.2 points this week",
      trendDirection: "up",
      icon: "growth",
    },
  ],
  clickActivity: {
    "7d": [
      { label: "Jul 9", clicks: 2840 },
      { label: "Jul 10", clicks: 3120 },
      { label: "Jul 11", clicks: 2960 },
      { label: "Jul 12", clicks: 3560 },
      { label: "Jul 13", clicks: 4210 },
      { label: "Jul 14", clicks: 3980 },
      { label: "Jul 15", clicks: 4570 },
    ],
    "30d": [
      { label: "Jun 16", clicks: 1180 },
      { label: "Jun 19", clicks: 1460 },
      { label: "Jun 22", clicks: 1740 },
      { label: "Jun 25", clicks: 1580 },
      { label: "Jun 28", clicks: 2260 },
      { label: "Jul 1", clicks: 2510 },
      { label: "Jul 4", clicks: 2390 },
      { label: "Jul 7", clicks: 2880 },
      { label: "Jul 10", clicks: 3120 },
      { label: "Jul 13", clicks: 4210 },
      { label: "Jul 15", clicks: 4570 },
    ],
  },
  devices: [
    { name: "Desktop", value: 46 },
    { name: "Mobile", value: 43 },
    { name: "Tablet", value: 11 },
  ],
  locations: [
    { place: "New York", country: "United States", clicks: 8420, share: 29 },
    { place: "Nairobi", country: "Kenya", clicks: 4860, share: 17 },
    { place: "London", country: "United Kingdom", clicks: 3910, share: 13 },
    { place: "Berlin", country: "Germany", clicks: 2710, share: 9 },
    { place: "Toronto", country: "Canada", clicks: 1840, share: 6 },
  ],
  links: [
    {
      id: "launch",
      shortUrl: "sho.rt/launch",
      originalUrl: "https://example.com/blog/product-launch",
      totalClicks: 18420,
      createdAt: "2026-07-13T09:12:00.000Z",
      status: "active",
    },
    {
      id: "q3deck",
      shortUrl: "sho.rt/q3deck",
      originalUrl: "https://example.com/decks/q3-investor-update",
      totalClicks: 3912,
      createdAt: "2026-07-10T15:45:00.000Z",
      status: "active",
    },
    {
      id: "webinar24",
      shortUrl: "sho.rt/webinar24",
      originalUrl: "https://example.com/events/webinar-archive",
      totalClicks: 891,
      createdAt: "2026-06-21T12:30:00.000Z",
      status: "expired",
    },
    {
      id: "help",
      shortUrl: "sho.rt/help",
      originalUrl: "https://example.com/help/support-handbook",
      totalClicks: 6208,
      createdAt: "2026-06-18T08:00:00.000Z",
      status: "active",
    },
    {
      id: "promo",
      shortUrl: "sho.rt/summer",
      originalUrl: "https://example.com/campaigns/summer-promo",
      totalClicks: 0,
      createdAt: "2026-07-15T10:20:00.000Z",
      status: "blocked",
    },
  ],
};

export async function getAnalyticsDashboard(): Promise<AnalyticsDashboardData> {
  return analyticsData;
}
