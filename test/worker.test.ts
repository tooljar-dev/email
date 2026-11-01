import { exports } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SERVERS } from "../src/data";
import { PAGE_PATHS } from "../src/seo";

const BROWSER = {
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
};
const CURL = { accept: "*/*", "user-agent": "curl/8.22.0" };
const TEMP_IP = [...SERVERS.keys()][0] ?? "";

function call(path: string, headers: Record<string, string> = CURL, method = "GET") {
  return exports.default.fetch(
    new Request(`https://email.tooljar.dev${path}`, { method, redirect: "manual", headers }),
  );
}

type Zone = Record<string, { MX?: string[]; A?: string[]; nx?: boolean }>;

/** Answers DNS-over-HTTPS questions from a small fake zone, or fails when zone is null. */
function mockDns(zone: Zone | null) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = new URL(String(input instanceof Request ? input.url : input));
    if (url.hostname !== "cloudflare-dns.com") throw new Error(`unexpected fetch ${url}`);
    if (zone === null) throw new Error("DNS down");
    const name = url.searchParams.get("name") ?? "";
    const type = url.searchParams.get("type");
    const entry = zone[name];
    if (!entry || entry.nx) return Response.json({ Status: 3 });
    const Answer =
      type === "MX"
        ? (entry.MX ?? []).map((h, i) => ({ type: 15, data: `${(i + 1) * 10} ${h}.` }))
        : (entry.A ?? []).map((ip) => ({ type: 1, data: ip }));
    return Response.json({ Status: 0, Answer });
  });
}

const ZONE: Zone = {
  "mailinator.com": { MX: ["mail.mailinator.com"] },
  "mail.mailinator.com": { A: ["192.0.2.1"] },
  "gmail.com": { MX: ["gmail-smtp-in.l.google.com"] },
  "gmail-smtp-in.l.google.com": { A: ["192.0.2.2"] },
  "fresh-temp.example": { MX: ["mx.fresh-temp.example"] },
  "mx.fresh-temp.example": { A: [TEMP_IP] },
  "nomail.example": { A: [] },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("plain text for scripts", () => {
  it("answers one word for a domain in the path", async () => {
    mockDns(ZONE);
    const res = await call("/mailinator.com");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("disposable\n");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });
  it("answers for a full address and for suspicious domains", async () => {
    mockDns(ZONE);
    expect(await (await call("/someone@mailinator.com")).text()).toBe("disposable\n");
    expect(await (await call("/a@fresh-temp.example")).text()).toBe("suspicious\n");
    expect(await (await call("/gmail.com")).text()).toBe("ok\n");
    expect(await (await call("/nothing.example")).text()).toBe("undeliverable\n");
  });
  it("explains usage on the home address", async () => {
    const res = await call("/");
    expect(await res.text()).toContain("curl email.tooljar.dev/");
  });
  it("refuses junk with 400", async () => {
    const res = await call("/not..valid");
    expect(res.status).toBe(400);
  });
});

describe("JSON API", () => {
  it("returns the full answer with reasons", async () => {
    mockDns(ZONE);
    const res = await call("/api/check?q=John.Doe%2Btrial%40gmail.com");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      email: "john.doe+trial@gmail.com",
      domain: "gmail.com",
      verdict: "ok",
      disposable: false,
      kind: "provider",
      normalized: "johndoe@gmail.com",
      mail: { checked: true, can_receive: true, servers: ["gmail-smtp-in.l.google.com"] },
    });
    expect(Object.keys(body)).toEqual([
      "email",
      "domain",
      "verdict",
      "disposable",
      "reasons",
      "lists",
      "listed_as",
      "kind",
      "mail",
      "normalized",
      "data",
    ]);
  });
  it("accepts email= and domain= too", async () => {
    mockDns(ZONE);
    const a = (await (await call("/api/check?email=x@mailinator.com")).json()) as {
      verdict: string;
    };
    const b = (await (await call("/api/check?domain=mailinator.com")).json()) as {
      verdict: string;
    };
    expect([a.verdict, b.verdict]).toEqual(["disposable", "disposable"]);
  });
  it("gives a 400 with an error for bad input", async () => {
    const res = await call("/api/check?q=hello");
    expect(res.status).toBe(400);
    expect(await res.json()).toHaveProperty("error");
  });
  it("still answers from the lists when DNS is down", async () => {
    mockDns(null);
    const body = (await (await call("/api/check?q=mailinator.com")).json()) as {
      verdict: string;
      mail: { checked: boolean };
    };
    expect(body.verdict).toBe("disposable");
    expect(body.mail.checked).toBe(false);
  });
  it("gives JSON for a path check when asked", async () => {
    mockDns(ZONE);
    const res = await call("/mailinator.com", { accept: "application/json" });
    expect(((await res.json()) as { verdict: string }).verdict).toBe("disposable");
  });
});

describe("pages", () => {
  it("serves every page in the sitemap", async () => {
    for (const path of PAGE_PATHS) {
      const res = await call(path, BROWSER);
      expect(res.status, path).toBe(200);
      const body = await res.text();
      expect(body, path).toContain("<title>");
      expect(body, path).toContain(
        `<link rel="canonical" href="https://email.tooljar.dev${path}">`,
      );
      expect(res.headers.get("content-security-policy"), path).toContain("default-src 'none'");
    }
  });
  it("sends browsers from a path check to the checker page", async () => {
    const res = await call("/mailinator.com", BROWSER);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://email.tooljar.dev/?q=mailinator.com");
  });
  it("shows the answer on the page, kept out of search results", async () => {
    mockDns(ZONE);
    const res = await call("/?q=someone%40mailinator.com", BROWSER);
    const body = await res.text();
    expect(body).toContain('data-verdict="disposable"');
    expect(body).toContain("someone@mailinator.com");
    expect(body).toContain('<meta name="robots" content="noindex">');
  });
  it("escapes what people type", async () => {
    const res = await call("/?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E", BROWSER);
    const body = await res.text();
    expect(body).not.toContain("<script>alert(1)");
    expect(body).toContain("&lt;script&gt;");
    expect(body).toContain('role="alert"');
  });
  it("has a 404 page", async () => {
    const res = await call("/nope", BROWSER);
    expect(res.status).toBe(404);
    expect(await res.text()).toContain("Page not found");
    expect((await call("/nope")).status).toBe(404);
  });
  it("redirects trailing slashes", async () => {
    const res = await call("/api/", BROWSER);
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://email.tooljar.dev/api");
  });
});

describe("files for crawlers", () => {
  it("serves robots.txt, sitemap.xml, llms.txt and security.txt", async () => {
    expect(await (await call("/robots.txt")).text()).toContain(
      "Sitemap: https://email.tooljar.dev/sitemap.xml",
    );
    const sitemap = await (await call("/sitemap.xml")).text();
    for (const path of PAGE_PATHS)
      expect(sitemap).toContain(`<loc>https://email.tooljar.dev${path}</loc>`);
    expect(await (await call("/llms.txt")).text()).toContain("# tooljar Email");
    expect(await (await call("/.well-known/security.txt")).text()).toContain("Contact:");
  });
});

describe("methods", () => {
  it("answers CORS preflight and refuses POST", async () => {
    const pre = await call("/api/check", CURL, "OPTIONS");
    expect(pre.status).toBe(204);
    expect(pre.headers.get("access-control-allow-origin")).toBe("*");
    expect((await call("/api/check", CURL, "POST")).status).toBe(405);
  });
});
