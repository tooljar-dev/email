// The checker: is this address or domain temp mail, and why?
import { ALLOW, DATA_META, DOMAINS, type Kind, listNames, SERVERS, SOURCES } from "./data";
import type { MailDns } from "./dns";

export type Verdict = "disposable" | "suspicious" | "undeliverable" | "ok";

export type ReasonCode =
  | "on_list"
  | "temp_mail_server"
  | "no_domain"
  | "no_mail"
  | "known_provider"
  | "forwarding_service"
  | "dns_failed"
  | "nothing_found";

export interface Reason {
  code: ReasonCode;
  text: string;
}

export interface Parsed {
  /** The full address, lower-case, when an address was given. */
  email: string | null;
  local: string | null;
  domain: string;
}

export interface Result {
  email: string | null;
  domain: string;
  verdict: Verdict;
  disposable: boolean;
  reasons: Reason[];
  /** The names of the lists that name this domain or one of its parent domains. */
  lists: string[];
  /** The exact entry on the lists: the domain itself or a parent domain. */
  listed_as: string | null;
  /** "provider" for big email providers, "forwarding" for privacy forwarding services. */
  kind: Kind | null;
  mail: {
    checked: boolean;
    exists: boolean | null;
    can_receive: boolean | null;
    servers: string[];
    temp_mail_server: boolean;
  };
  /** Gmail and similar: the address with dots and the +part removed, when that changes it. */
  normalized: string | null;
  data: { updated: string; domains: number; lists: number };
}

const DOMAIN_RE = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/;

/** Turns what someone typed ("Name@Mail.Example.", "mailto:…", a bare domain) into parts. */
export function parseInput(input: string): Parsed | null {
  let text = input.trim().replace(/^mailto:/i, "");
  if (!text || text.length > 320) return null;
  let local: string | null = null;
  const at = text.lastIndexOf("@");
  if (at >= 0) {
    local = text.slice(0, at).toLowerCase();
    text = text.slice(at + 1);
    if (!local || local.length > 64 || /[\s<>()[\]\\,;:"]/.test(local)) return null;
  }
  let domain: string;
  try {
    // The URL parser turns international names (bücher.de) into their ASCII form (xn--…).
    domain = new URL(`http://${text.replace(/\.$/, "")}`).hostname;
  } catch {
    return null;
  }
  if (!DOMAIN_RE.test(domain) || /^[\d.]+$/.test(domain)) return null;
  return { email: local ? `${local}@${domain}` : null, local, domain };
}

/** The domain itself and each parent, longest first: a.b.example.com, b.example.com, example.com. */
function withParents(domain: string): string[] {
  const out: string[] = [];
  for (let d = domain; d.includes("."); d = d.slice(d.indexOf(".") + 1)) out.push(d);
  return out;
}

export function findListed(domain: string): { entry: string; bits: number } | null {
  for (const d of withParents(domain)) {
    const bits = DOMAINS.get(d);
    if (bits) return { entry: d, bits };
  }
  return null;
}

export function findAllowed(domain: string): Kind | null {
  for (const d of withParents(domain)) {
    const kind = ALLOW.get(d);
    if (kind) return kind;
  }
  return null;
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

/** john.doe+shop@gmail.com → johndoe@gmail.com. null when nothing changes. */
export function normalize(local: string, domain: string): string | null {
  let user = local;
  if (PLUS_TAGS.has(domain)) user = user.split("+")[0] ?? user;
  if (DOT_BLIND.has(domain)) user = user.replace(/\./g, "");
  const host = domain === "googlemail.com" ? "gmail.com" : domain;
  const out = `${user}@${host}`;
  return user && out !== `${local}@${domain}` ? out : null;
}

function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}

/** Builds the answer from the lists and (when available) the live DNS answer. */
export function check(parsed: Parsed, dns: MailDns | null): Result {
  const { domain } = parsed;
  const reasons: Reason[] = [];
  const kind = findAllowed(domain);
  const listed = kind ? null : findListed(domain);
  const lists = listed ? listNames(listed.bits) : [];
  const tempServerIps = (dns?.ips ?? []).filter((ip) => SERVERS.has(ip));
  const tempServerDomains = Math.max(0, ...tempServerIps.map((ip) => SERVERS.get(ip) ?? 0));

  let verdict: Verdict = "ok";
  if (kind === "provider") {
    reasons.push({ code: "known_provider", text: "A well-known email provider. Not temp mail." });
  } else if (kind === "forwarding") {
    reasons.push({
      code: "forwarding_service",
      text: "A privacy forwarding service: mail goes on to the owner's real inbox, and the address lasts as long as they want. Some lists call this temp mail; we don't.",
    });
  }

  if (listed) {
    verdict = "disposable";
    const where = listed.entry === domain ? "This domain" : `Its parent domain ${listed.entry}`;
    reasons.push({
      code: "on_list",
      text: `${where} is on ${plural(lists.length, "public temp mail list", "public temp mail lists")}: ${lists.join(", ")}.`,
    });
  }

  if (!dns) {
    reasons.push({
      code: "dns_failed",
      text: "We could not look up the mail server just now, so only the lists were checked.",
    });
  } else if (!dns.exists) {
    if (verdict === "ok" && !kind) verdict = "undeliverable";
    reasons.push({ code: "no_domain", text: "This domain does not exist." });
  } else if (!dns.canReceive) {
    if (verdict === "ok" && !kind) verdict = "undeliverable";
    reasons.push({
      code: "no_mail",
      text: "This domain cannot receive email: it has no mail server.",
    });
  } else if (tempServerIps.length > 0 && !kind) {
    if (verdict === "ok") verdict = "suspicious";
    reasons.push({
      code: "temp_mail_server",
      text: `Its mail server also handles ${plural(tempServerDomains, "known temp mail domain", "known temp mail domains")}, and no popular website uses it. A warning sign, not proof.`,
    });
  }

  if (verdict === "ok" && !kind && dns) {
    reasons.push({
      code: "nothing_found",
      text: `Not on any of the ${SOURCES.length} lists, and its mail server is not one that temp mail services use.`,
    });
  }

  const normalized = parsed.local ? normalize(parsed.local, domain) : null;
  return {
    email: parsed.email,
    domain,
    verdict,
    disposable: verdict === "disposable",
    reasons,
    lists,
    listed_as: listed?.entry ?? null,
    kind,
    mail: {
      checked: dns !== null,
      exists: dns ? dns.exists : null,
      can_receive: dns ? dns.canReceive : null,
      servers: dns?.hosts ?? [],
      temp_mail_server: tempServerIps.length > 0,
    },
    normalized,
    data: { updated: DATA_META.updated, domains: DATA_META.domains, lists: SOURCES.length },
  };
}
