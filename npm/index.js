// is-temp-email: is this email address temp mail (disposable)? Offline, from 5 merged open lists.
// The same rules as https://email.tooljar.dev (src/check.ts in this repo). Keep them in step.
import { ALLOW, DOMAINS, SOURCES, UPDATED } from "./data.js";

const DOMAIN_RE = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/;
const API = "https://email.tooljar.dev/api/check";

let domains = null;
let allow = null;

function load() {
  if (domains) return;
  domains = new Map();
  for (const line of DOMAINS.split("\n")) {
    const tab = line.indexOf("\t");
    if (tab > 0) domains.set(line.slice(0, tab), Number(line.slice(tab + 1)));
  }
  allow = new Map();
  for (const line of ALLOW.split("\n")) {
    const [domain, kind] = line.split("\t");
    if (domain && kind) allow.set(domain, kind);
  }
}

function parse(input) {
  if (typeof input !== "string") return null;
  let text = input.trim().replace(/^mailto:/i, "");
  if (!text || text.length > 320) return null;
  let local = null;
  const at = text.lastIndexOf("@");
  if (at >= 0) {
    local = text.slice(0, at).toLowerCase();
    text = text.slice(at + 1);
    if (!local || local.length > 64 || /[\s<>()[\]\\,;:"]/.test(local)) return null;
  }
  let domain;
  try {
    domain = new URL(`http://${text.replace(/\.$/, "")}`).hostname;
  } catch {
    return null;
  }
  if (!DOMAIN_RE.test(domain) || /^[\d.]+$/.test(domain)) return null;
  return { local, domain };
}

function* withParents(domain) {
  for (let d = domain; d.includes("."); d = d.slice(d.indexOf(".") + 1)) yield d;
}

const DOT_BLIND = new Set(["gmail.com", "googlemail.com"]);
const PLUS_TAGS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "fastmail.com",
]);

function normalizeParts(local, domain) {
  let user = local;
  if (PLUS_TAGS.has(domain)) user = user.split("+")[0] ?? user;
  if (DOT_BLIND.has(domain)) user = user.replace(/\./g, "");
  const host = domain === "googlemail.com" ? "gmail.com" : domain;
  const out = `${user}@${host}`;
  return user && out !== `${local}@${domain}` ? out : null;
}

/**
 * Checks an address or a domain against the merged lists, offline.
 * Returns null when the input is not an email address or a domain.
 */
export function checkEmail(input) {
  const parsed = parse(input);
  if (!parsed) return null;
  load();
  const { local, domain } = parsed;
  let kind = null;
  for (const d of withParents(domain)) {
    kind = allow.get(d) ?? null;
    if (kind) break;
  }
  let listedAs = null;
  let bits = 0;
  if (!kind) {
    for (const d of withParents(domain)) {
      const b = domains.get(d);
      if (b) {
        listedAs = d;
        bits = b;
        break;
      }
    }
  }
  return {
    domain,
    disposable: listedAs !== null,
    listedAs,
    lists: SOURCES.filter((_, i) => bits & (1 << i)),
    kind,
    normalized: local ? normalizeParts(local, domain) : null,
  };
}

/** true when the address or domain is on a temp mail list. false for anything else. */
export function isTempMail(input) {
  return checkEmail(input)?.disposable ?? false;
}

/** The same as isTempMail, named after the package. */
export const isTempEmail = isTempMail;

/** Gmail and others: the real inbox, with dots and the +part removed. null when nothing changes. */
export function normalizeEmail(input) {
  const parsed = parse(input);
  return parsed?.local ? normalizeParts(parsed.local, parsed.domain) : null;
}

/**
 * Asks https://email.tooljar.dev, which also checks the domain's mail server live
 * (verdict "suspicious") and whether the domain can receive mail ("undeliverable").
 * Only use it where a network call is fine. Fair use: 50 requests in 10 s per IP.
 */
export async function checkOnline(input, options = {}) {
  const res = await fetch(`${API}?q=${encodeURIComponent(String(input))}`, {
    signal: options.signal,
    headers: { accept: "application/json" },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
  return body;
}

/** The day the bundled lists were built (YYYY-MM-DD). */
export const dataUpdated = UPDATED;
