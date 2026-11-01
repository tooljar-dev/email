// Facts about the site, kept in one place.
export const SITE = {
  host: "email.tooljar.dev",
  origin: "https://email.tooljar.dev",
  name: "tooljar Email",
  repo: "https://github.com/tooljar-dev/email",
  // The day the page texts last changed. Used as <lastmod> in the sitemap, so keep it honest.
  updated: "2026-11-01",
} as const;

export interface Env {
  ASSETS: Fetcher;
  ANALYTICS_TOKEN: string;
}
