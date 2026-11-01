// The data the checker works from. scripts/update-data.mjs rebuilds these files every day.
// They are parsed once, when the Worker starts (start-up has its own, larger time budget).
import ALLOW_TXT from "../data/allow.txt";
import DOMAINS_TXT from "../data/domains.txt";
import META from "../data/meta.json";
import SERVERS_TXT from "../data/servers.txt";

export interface Source {
  id: string;
  home: string;
  license: string;
  count: number;
}

/** The five lists, in bit order: the first list is bit 1, the second bit 2, then 4, 8, 16. */
export const SOURCES: Source[] = META.sources;
export const DATA_META = META;

export type Kind = "provider" | "forwarding";

function parseDomains(text: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const line of text.split("\n")) {
    const tab = line.indexOf("\t");
    if (tab > 0) map.set(line.slice(0, tab), Number(line.slice(tab + 1)));
  }
  return map;
}

function parseServers(text: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const line of text.split("\n")) {
    const [ip, count] = line.split("\t");
    if (ip && count) map.set(ip, Number(count));
  }
  return map;
}

function parseAllow(text: string): Map<string, Kind> {
  const map = new Map<string, Kind>();
  for (const raw of text.split("\n")) {
    const [domain, kind] = raw.replace(/#.*/, "").trim().split(/\s+/);
    if (domain && (kind === "provider" || kind === "forwarding")) map.set(domain, kind);
  }
  return map;
}

/** Listed temp mail domain → which lists name it (a bit per list). */
export const DOMAINS = parseDomains(DOMAINS_TXT);
/** Mail server IPv4 address → how many listed domains use it. */
export const SERVERS = parseServers(SERVERS_TXT);
/** Domains we never call temp mail. */
export const ALLOW = parseAllow(ALLOW_TXT);

export function listNames(bits: number): string[] {
  return SOURCES.filter((_, i) => bits & (1 << i)).map((s) => s.id);
}
