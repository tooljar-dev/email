// Live DNS lookups through Cloudflare's public resolver (1.1.1.1, DNS over HTTPS).
// Only the domain is sent, never the part of the address before the @.

const DOH = "https://cloudflare-dns.com/dns-query";
const TIMEOUT_MS = 2500;
const MAX_HOSTS = 3;

export interface MailDns {
  /** false when the domain does not exist at all (NXDOMAIN). */
  exists: boolean;
  /** Can this domain receive email: an MX record, or an address record as the fallback. */
  canReceive: boolean;
  /** MX host names, lowest priority number first. */
  hosts: string[];
  /** IPv4 addresses of the first few MX hosts. */
  ips: string[];
}

interface DohAnswer {
  Status: number;
  Answer?: { type: number; data: string }[];
}

async function query(name: string, type: "MX" | "A"): Promise<DohAnswer> {
  const url = `${DOH}?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetch(url, {
    headers: { accept: "application/dns-json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  if (!res.ok) throw new Error(`DNS HTTP ${res.status}`);
  return (await res.json()) as DohAnswer;
}

function addresses(answer: DohAnswer): string[] {
  return (answer.Answer ?? []).filter((a) => a.type === 1).map((a) => a.data);
}

/** Parses MX answers ("10 mx1.example.com.") into host names, best priority first. */
export function mxHosts(answer: DohAnswer): { hosts: string[]; nullMx: boolean } {
  const records = (answer.Answer ?? [])
    .filter((a) => a.type === 15)
    .map((a) => {
      const [priority, host = ""] = a.data.trim().split(/\s+/);
      return { priority: Number(priority), host: host.toLowerCase().replace(/\.$/, "") };
    })
    .sort((a, b) => a.priority - b.priority);
  // A "null MX" (RFC 7505) is a single record with an empty host: "this domain takes no mail".
  const nullMx = records.length > 0 && records.every((r) => r.host === "");
  return { hosts: [...new Set(records.map((r) => r.host).filter(Boolean))], nullMx };
}

/** null when DNS could not be asked (timeout, network error). */
export async function lookUpMail(domain: string): Promise<MailDns | null> {
  try {
    const mx = await query(domain, "MX");
    if (mx.Status === 3) return { exists: false, canReceive: false, hosts: [], ips: [] };
    if (mx.Status !== 0) return null;
    const { hosts, nullMx } = mxHosts(mx);
    if (nullMx) return { exists: true, canReceive: false, hosts: [], ips: [] };
    if (hosts.length === 0) {
      // No MX record: mail servers then try the domain's own address (RFC 5321, 5.1).
      const own = addresses(await query(domain, "A"));
      return { exists: true, canReceive: own.length > 0, hosts: [], ips: own };
    }
    const found = await Promise.all(
      hosts.slice(0, MAX_HOSTS).map((h) => query(h, "A").then(addresses, () => [])),
    );
    return { exists: true, canReceive: true, hosts, ips: [...new Set(found.flat())] };
  } catch {
    return null;
  }
}
