export type LinkStatus = "active" | "expired" | "blocked";

export interface ShortLink {
  id: string;
  title: string;
  destinationUrl: string;
  shortUrl: string;
  shortCode: string;
  status: LinkStatus;
  clicks: number;
  createdAt: string;
  expiresAt?: string;
}

export interface ChartPoint {
  label: string;
  clicks: number;
}

export interface BreakdownItem {
  name: string;
  value: number;
}
