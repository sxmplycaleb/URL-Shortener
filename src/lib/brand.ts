export const APP_NAME = "Shortly";
export const APP_CATEGORY = "URL Shortener";
export const APP_FULL_NAME = `${APP_NAME} ${APP_CATEGORY}`;
export const APP_TAGLINE = "Short links with clear analytics.";
export const APP_DESCRIPTION =
  "Create reliable short links with ownership, analytics, secure authentication, and production-ready redirects.";
export const APP_KEYWORDS = [
  "URL shortener",
  "short links",
  "link analytics",
  "custom aliases",
  "redirect tracking",
  "Shortly",
];
export const APP_AUTHOR = "Shortly";
export const APP_VERSION = "0.1.0";
export const GITHUB_URL = "https://github.com/sxmplycaleb";
export const CONTACT_PHONE = "+254790321533";
export const CONTACT_WHATSAPP_URL = "https://wa.me/254790321533";
export const CONTACT_EMAIL_PLACEHOLDER = "support@shortly.example";
export const OFFICE_LOCATION_PLACEHOLDER = "Future office location";
export const SOCIAL_IMAGE_PATH = "/social-preview.png";

export const SOCIAL_LINKS = [
  { id: "github", label: "GitHub", href: GITHUB_URL },
  { id: "linkedin", label: "LinkedIn", href: "https://linkedin.com/in/sxmplycaleb" },
  { id: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@omanutro?_r=1&_t=ZS-97ir8ngyBz0" },
  { id: "x", label: "X", href: "https://x.com/omanutro" },
  { id: "facebook", label: "Facebook", href: "https://www.facebook.com/share/1BTrQGbvMC/" },
  { id: "instagram", label: "Instagram", href: "https://www.instagram.com/omanutro?igsh=cnJ2MGp1NDJjdXNz" },
  { id: "whatsapp", label: "WhatsApp", href: CONTACT_WHATSAPP_URL },
] as const;

export function getPageTitle(page: string) {
  return `${page} | ${APP_CATEGORY}`;
}
