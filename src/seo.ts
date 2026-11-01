// Files for search engines and AI tools: robots.txt, sitemap.xml, llms.txt, security.txt.
import { DATA_META, SOURCES } from "./data";
import { SITE } from "./site";

/** Every public page, in the order the sitemap lists them. */
export const PAGE_PATHS = [
  "/",
  "/should-i-block-temp-mail",
  "/how-it-works",
  "/api",
  "/privacy",
] as const;

export function robotsTxt(): string {
  return `# tooljar Email: every crawler is welcome, AI crawlers included.
# Result pages (/?q=…) and API answers are not for search results.
User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${SITE.origin}/sitemap.xml
`;
}

export function sitemapXml(): string {
  const urls = PAGE_PATHS.map(
    (path) => `  <url><loc>${SITE.origin}${path}</loc><lastmod>${SITE.updated}</lastmod></url>`,
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function llmsTxt(): string {
  const o = SITE.origin;
  return `# tooljar Email

> Free temp mail checker and API. Tells whether an email address or domain is disposable (temp mail), and why. It merges ${SOURCES.length} open lists (${DATA_META.domains} domains, updated daily), checks the domain's mail server live, and removes Gmail dots and +tags. No key, no sign-up, CORS enabled, free for commercial use.

## API

- [One word](${o}/mailinator.com): \`curl ${SITE.host}/<address or domain>\` prints disposable, suspicious, undeliverable or ok.
- [JSON](${o}/api/check?q=mailinator.com): \`/api/check?q=<address or domain>\`. Fields: email, domain, verdict, disposable, reasons[{code,text}], lists, listed_as, kind (provider|forwarding|null), mail{checked,exists,can_receive,servers,temp_mail_server}, normalized, data{updated,domains,lists}.
- verdict "suspicious" means: on no list, but its mail server is used only by known temp mail domains. It is a warning, not proof (about 0.25% of popular websites trigger it).
- Privacy forwarding services (DuckDuckGo, Firefox Relay, SimpleLogin, addy.io, Apple Hide My Email) are kind "forwarding" and verdict "ok", not temp mail.
- [API documentation](${o}/api)
- Fair use: up to 50 requests in 10 seconds per IP, then HTTP 429 for 10 seconds.

## Guides

- [Should you block temp mail at sign-up?](${o}/should-i-block-temp-mail)
- [How the checker works: data sources and accuracy](${o}/how-it-works)

## Source

- [Source code and data (MIT license)](${SITE.repo})
- [Privacy](${o}/privacy): addresses are not stored or logged; only the domain goes to Cloudflare DNS.
`;
}

export function securityTxt(): string {
  return `Contact: ${SITE.repo}/security/advisories/new
Contact: mailto:saba@tooljar.dev
Expires: 2027-11-01T00:00:00.000Z
Preferred-Languages: en
Canonical: ${SITE.origin}/.well-known/security.txt
`;
}
