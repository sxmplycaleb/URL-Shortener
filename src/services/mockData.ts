import type { BreakdownItem, ChartPoint, ShortLink } from "@/types/link";

export const links: ShortLink[] = [
  {
    id: "1",
    title: "Launch announcement",
    destinationUrl: "https://example.com/blog/product-launch",
    shortUrl: "https://sho.rt/launch",
    shortCode: "launch",
    status: "active",
    clicks: 18420,
    createdAt: "Jul 13, 2026",
  },
  {
    id: "2",
    title: "Investor deck",
    destinationUrl: "https://example.com/decks/q3-investor-update",
    shortUrl: "https://sho.rt/q3deck",
    shortCode: "q3deck",
    status: "active",
    clicks: 3912,
    createdAt: "Jul 10, 2026",
  },
  {
    id: "3",
    title: "Old webinar",
    destinationUrl: "https://example.com/events/webinar-archive",
    shortUrl: "https://sho.rt/webinar24",
    shortCode: "webinar24",
    status: "expired",
    clicks: 891,
    createdAt: "Jun 21, 2026",
    expiresAt: "Jul 1, 2026",
  },
  {
    id: "4",
    title: "Support handbook",
    destinationUrl: "https://example.com/help/support-handbook",
    shortUrl: "https://sho.rt/help",
    shortCode: "help",
    status: "active",
    clicks: 6208,
    createdAt: "Jun 18, 2026",
  },
];

export const clickTimeline: ChartPoint[] = [
  { label: "Mon", clicks: 420 },
  { label: "Tue", clicks: 680 },
  { label: "Wed", clicks: 730 },
  { label: "Thu", clicks: 980 },
  { label: "Fri", clicks: 1240 },
  { label: "Sat", clicks: 860 },
  { label: "Sun", clicks: 1150 },
];

export const countries: BreakdownItem[] = [
  { name: "United States", value: 42 },
  { name: "Kenya", value: 18 },
  { name: "United Kingdom", value: 14 },
  { name: "Germany", value: 9 },
];

export const devices: BreakdownItem[] = [
  { name: "Mobile", value: 58 },
  { name: "Desktop", value: 34 },
  { name: "Tablet", value: 8 },
];

export const browsers: BreakdownItem[] = [
  { name: "Chrome", value: 61 },
  { name: "Safari", value: 21 },
  { name: "Edge", value: 11 },
  { name: "Firefox", value: 7 },
];

export const referrers: BreakdownItem[] = [
  { name: "Direct", value: 37 },
  { name: "LinkedIn", value: 24 },
  { name: "X", value: 18 },
  { name: "Newsletter", value: 13 },
];
