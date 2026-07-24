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
export const GITHUB_URL = "https://github.com/sxmplycaleb/url-shortener";
export const SOCIAL_IMAGE_PATH = "/social-preview.png";

export function getPageTitle(page: string) {
  return `${page} | ${APP_CATEGORY}`;
}
