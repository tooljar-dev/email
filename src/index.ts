// tooljar Email: the Worker behind https://email.tooljar.dev.
// Static files (icons) are served from ./public before this code runs.
import { check, type Parsed, parseInput, type Result } from "./check";
import { lookUpMail } from "./dns";
import { type Page, renderPage } from "./layout";
import { pickFormat } from "./negotiate";
import { apiPage } from "./pages/api";
import { blockPage } from "./pages/block";
import { homePage } from "./pages/home";
import { howPage } from "./pages/how";
import { notFoundPage } from "./pages/notfound";
import { privacyPage } from "./pages/privacy";
import { llmsTxt, robotsTxt, securityTxt, sitemapXml } from "./seo";
import { type Env, SITE } from "./site";

const CSP = [
  "default-src 'none'",
  "script-src https://static.cloudflareinsights.com",
  "style-src 'unsafe-inline'",
  "img-src 'self' data:",
  // 'self': Cloudflare's automatic Web Analytics beacon reports to /cdn-cgi/rum on this host.
  // Without it every visit report was blocked (found 2026-11-02).
  "connect-src 'self' https://cloudflareinsights.com",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const API_HEADERS = {
  "access-control-allow-origin": "*",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex",
};

const PAGES: Record<string, () => Page> = {
  "/should-i-block-temp-mail": blockPage,
  "/how-it-works": howPage,
  "/api": apiPage,
  "/privacy": privacyPage,
};

const BAD_INPUT = "That is not an email address or a domain. Try name@example.com or example.com.";

function text(body: string, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers: { ...API_HEADERS, "content-type": "text/plain; charset=utf-8", ...extra },
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(`${JSON.stringify(data, null, 2)}\n`, {
    status,
    headers: { ...API_HEADERS, "content-type": "application/json; charset=utf-8" },
  });
}

function page(p: Page, env: Env, extra: Record<string, string> = {}): Response {
  return new Response(renderPage(p, env.ANALYTICS_TOKEN), {
    status: p.status ?? 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy": CSP,
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "permissions-policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
      "strict-transport-security": "max-age=63072000; includeSubDomains",
      ...extra,
    },
  });
}

function file(body: string, type: string): Response {
  return new Response(body, {
    headers: { "content-type": `${type}; charset=utf-8`, "cache-control": "public, max-age=3600" },
  });
}

async function run(parsed: Parsed): Promise<Result> {
  return check(parsed, await lookUpMail(parsed.domain));
}

/** "/mailinator.com" or "/someone@mailinator.com": a check in the path (has a dot or an @). */
function pathQuery(path: string): string | null {
  let value: string;
  try {
    value = decodeURIComponent(path.slice(1));
  } catch {
    return null;
  }
  return !value.includes("/") && (value.includes(".") || value.includes("@")) ? value : null;
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path.length > 1 && path.endsWith("/")) {
    url.pathname = path.replace(/\/+$/, "") || "/";
    return Response.redirect(url.toString(), 301);
  }
  if (path === "/index.html") return Response.redirect(new URL("/", url).toString(), 301);

  switch (path) {
    case "/api/check": {
      const q =
        url.searchParams.get("q") ??
        url.searchParams.get("email") ??
        url.searchParams.get("domain");
      const parsed = q ? parseInput(q) : null;
      if (!parsed) return json({ error: BAD_INPUT }, 400);
      return json(await run(parsed));
    }
    case "/robots.txt":
      return file(robotsTxt(), "text/plain");
    case "/sitemap.xml":
      return file(sitemapXml(), "application/xml");
    case "/llms.txt":
      return file(llmsTxt(), "text/plain");
    case "/.well-known/security.txt":
      return file(securityTxt(), "text/plain");
  }

  const format = pickFormat(request);

  // Browsers never use http:// here (.dev forces HTTPS), but old links and crawlers might.
  if (format === "html" && /"scheme":"http"/.test(request.headers.get("cf-visitor") ?? "")) {
    url.protocol = "https:";
    return Response.redirect(url.toString(), 301);
  }

  const inPath = pathQuery(path);
  if (inPath !== null) {
    // A browser that opens /mailinator.com gets the checker page with the answer.
    if (format === "html") {
      const to = new URL("/", url);
      to.searchParams.set("q", inPath);
      return Response.redirect(to.toString(), 302);
    }
    const parsed = parseInput(inPath);
    if (!parsed) return text(`${BAD_INPUT}\n`, 400);
    const result = await run(parsed);
    return format === "json" ? json(result) : text(`${result.verdict}\n`);
  }

  if (path === "/") {
    const q = (url.searchParams.get("q") ?? "").trim();
    if (format !== "html") {
      return text(`Usage: curl ${SITE.host}/<email address or domain>\nDocs: ${SITE.origin}/api\n`);
    }
    if (!q) return page(homePage("", null), env);
    const parsed = parseInput(q);
    const outcome = parsed ? { result: await run(parsed) } : { error: BAD_INPUT };
    return page(homePage(q, outcome), env);
  }

  const build = PAGES[path];
  if (build) return page(build(), env);
  return format === "html" ? page(notFoundPage(path), env) : text("Not found\n", 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, HEAD, OPTIONS",
          "access-control-allow-headers": "*",
          "access-control-max-age": "86400",
        },
      });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return text("Method not allowed\n", 405, { allow: "GET, HEAD, OPTIONS" });
    }

    const response = await route(request, env);

    // Copies of the site on other addresses (local dev, previews) stay out of search results.
    const headers = new Headers(response.headers);
    if (new URL(request.url).hostname !== SITE.host) headers.set("x-robots-tag", "noindex");
    return new Response(request.method === "HEAD" ? null : response.body, {
      status: response.status,
      headers,
    });
  },
} satisfies ExportedHandler<Env>;
