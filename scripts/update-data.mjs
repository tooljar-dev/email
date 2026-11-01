// The daily data job. Run with `npm run data` (GitHub Actions runs it every day).
//
// 1. Downloads five public lists of temp mail domains and merges them into data/domains.txt.
// 2. Looks up the mail servers (MX records) of every listed domain, and of popular normal
//    websites, and learns which mail servers only temp mail domains use: data/servers.txt.
// 3. Tests itself: false alarms on popular websites it never saw, and a "backtest" that asks
//    whether last month's data would have flagged the domains the main list added since.
// 4. Writes the files only when every check passes. Otherwise it exits with an error and the
//    old data stays, so a broken source never reaches the live site.
//
// No dependencies: Node 22+ only (fetch, node:dns, node:zlib).
import { Resolver } from "node:dns/promises";
import { readFile, writeFile } from "node:fs/promises";
import { domainToASCII } from "node:url";
import { inflateRawSync } from "node:zlib";

const DATA = new URL("../data/", import.meta.url);

/** The lists we merge. `bit` marks which lists name a domain (stored in domains.txt). */
const SOURCES = [
  {
    id: "disposable-email-domains",
    bit: 1,
    license: "CC0-1.0",
    home: "https://github.com/disposable-email-domains/disposable-email-domains",
    url: "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf",
  },
  {
    id: "mailchecker",
    bit: 2,
    license: "MIT",
    home: "https://github.com/FGRibreau/mailchecker",
    url: "https://raw.githubusercontent.com/FGRibreau/mailchecker/master/list.txt",
  },
  {
    id: "castle",
    bit: 4,
    license: "MIT",
    home: "https://github.com/castle/disposable-email-domains",
    url: "https://raw.githubusercontent.com/castle/disposable-email-domains/master/disposable-email-domains.txt",
  },
  {
    id: "fakefilter",
    bit: 8,
    license: "BSD-3-Clause",
    home: "https://github.com/7c/fakefilter",
    url: "https://raw.githubusercontent.com/7c/fakefilter/main/txt/data.txt",
  },
  {
    id: "burner-email-providers",
    bit: 16,
    license: "MIT",
    home: "https://github.com/wesbos/burner-email-providers",
    url: "https://raw.githubusercontent.com/wesbos/burner-email-providers/master/emails.txt",
  },
];

const PSL_URL = "https://publicsuffix.org/list/public_suffix_list.dat";
const TRANCO_URL = "https://tranco-list.eu/top-1m.csv.zip";
const MAIN_REPO = "disposable-email-domains/disposable-email-domains";
const MAIN_FILE = "disposable_email_blocklist.conf";

// Mail services shared by many normal domains. Their servers are never learned as temp mail
// servers, even though temp mail domains use them too (317 listed domains used Cloudflare's
// on 2026-11-01). Matched against the MX host name.
const SHARED_MX = [
  "mx.cloudflare.net",
  "google.com",
  "googlemail.com",
  "outlook.com",
  "zoho.com",
  "zoho.eu",
  "zohomail.com",
  "yandex.net",
  "yandex.ru",
  "mailgun.org",
  "sendgrid.net",
  "amazonaws.com",
  "improvmx.com",
  "forwardemail.net",
  "mimecast.com",
  "pphosted.com",
  "barracudanetworks.com",
  "privateemail.com",
  "registrar-servers.com",
  "ovh.net",
  "gandi.net",
  "ionos.com",
  "hostinger.com",
  "titan.email",
  "secureserver.net",
  "mail.ru",
  "qq.com",
  "icloud.com",
  "messagingengine.com",
  "migadu.com",
  "mxrouting.net",
  "emailsrvr.com",
  "iphmx.com",
  "mxhichina.com",
  "aliyun.com",
  "naver.com",
  // Forwarding services: people's own domains point here too (checked 2026-11-01).
  "simplelogin.co",
  "anonaddy.me",
  "addy.io",
  "duck.com",
  "privaterelay.appleid.com",
];

// Reserved names (RFC 2606, RFC 6761): made for examples and tests, they never receive mail.
// They are not temp mail; the live check calls them undeliverable instead.
const RESERVED_DOMAINS = new Set(["example.com", "example.net", "example.org"]);
const RESERVED_TLDS = new Set(["example", "test", "invalid", "localhost", "local"]);

function isReserved(domain) {
  return (
    RESERVED_TLDS.has(domain.slice(domain.lastIndexOf(".") + 1)) ||
    [...RESERVED_DOMAINS].some((r) => domain === r || domain.endsWith(`.${r}`))
  );
}

const MIN_LISTED = 3; // a server must carry at least this many listed domains
const MAX_FALSE_ALARM = 0.005; // stop if more than 0.5% of unseen popular sites get flagged
const CONTROL_SIZE = 20000; // popular websites used to learn "normal" mail servers
const BACKTEST_DAYS = 30;
const DNS_CONCURRENCY = 150;

const DOMAIN_RE = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/;

function log(...args) {
  console.log(new Date().toISOString().slice(11, 19), ...args);
}

async function get(url, as = "text") {
  const headers = { "user-agent": "tooljar-email-data (+https://email.tooljar.dev)" };
  if (process.env.GITHUB_TOKEN && url.startsWith("https://api.github.com/")) {
    headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(120_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (as === "json") return await res.json();
      if (as === "bytes") return new Uint8Array(await res.arrayBuffer());
      return await res.text();
    } catch (error) {
      if (attempt >= 3) throw new Error(`${url}: ${error.message}`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

/** One list line → a clean ASCII domain, or null for comments, blanks and junk. */
function cleanDomain(line) {
  let d = line.trim().toLowerCase();
  if (!d || d.startsWith("#") || d.startsWith("//")) return null;
  d = d.split(/\s/)[0];
  if (d.includes("@")) d = d.slice(d.lastIndexOf("@") + 1);
  d = d.replace(/^\*\./, "").replace(/^\.+/, "").replace(/\.+$/, "");
  d = domainToASCII(d);
  return d && DOMAIN_RE.test(d) ? d : null;
}

/** Plain rules of the Public Suffix List (co.uk, github.io …). Wildcards count by their base. */
function parsePsl(textData) {
  const set = new Set();
  for (const raw of textData.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("//") || line.startsWith("!")) continue;
    const rule = domainToASCII(line.replace(/^\*\./, ""));
    if (rule) set.add(rule);
  }
  return set;
}

/** "domain kind  # note" lines: domains we never flag (big providers, forwarding services). */
async function readAllow() {
  const textData = await readFile(new URL("allow.txt", DATA), "utf8");
  const map = new Map();
  for (const raw of textData.split("\n")) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const [domain, kind] = line.split(/\s+/);
    if (domain && (kind === "provider" || kind === "forwarding")) map.set(domain, kind);
  }
  return map;
}

/** Does the domain, or one of its parent domains, appear in the set? */
function listedWithParents(set, domain) {
  for (let d = domain; d.includes("."); d = d.slice(d.indexOf(".") + 1)) {
    if (set.has(d)) return true;
  }
  return false;
}

/** The first file inside a .zip (Tranco ships its CSV that way). */
function unzipFirst(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = bytes.length - 22;
  while (eocd >= 0 && view.getUint32(eocd, true) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("zip: no end record");
  const central = view.getUint32(eocd + 16, true);
  const method = view.getUint16(central + 10, true);
  const size = view.getUint32(central + 20, true);
  const local = view.getUint32(central + 42, true);
  const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
  const data = bytes.subarray(start, start + size);
  return Buffer.from(method === 0 ? data : inflateRawSync(data)).toString("utf8");
}

async function pool(items, size, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return out;
}

const resolver = new Resolver({ timeout: 4000, tries: 2 });
resolver.setServers(["1.1.1.1", "8.8.8.8", "1.0.0.1", "8.8.4.4"]);

/** MX host names; [] when the domain has no mail server; null when DNS gave no answer. */
async function mxHosts(domain) {
  try {
    const records = await resolver.resolveMx(domain);
    return [...new Set(records.map((r) => r.exchange.toLowerCase().replace(/\.$/, "")))].filter(
      Boolean,
    );
  } catch (error) {
    return error.code === "ENODATA" || error.code === "ENOTFOUND" ? [] : null;
  }
}

async function ipv4(host) {
  try {
    return await resolver.resolve4(host);
  } catch {
    return [];
  }
}

function isShared(host) {
  return SHARED_MX.some((s) => host === s || host.endsWith(`.${s}`));
}

/** Looks up MX hosts for every domain and IPv4 addresses for every MX host. */
async function lookUp(domains) {
  const mx = new Map();
  const results = await pool(domains, DNS_CONCURRENCY, mxHosts);
  domains.forEach((d, i) => {
    mx.set(d, results[i]);
  });
  const hosts = [...new Set([...mx.values()].flatMap((h) => h ?? []))].filter((h) => !isShared(h));
  const addresses = await pool(hosts, DNS_CONCURRENCY, ipv4);
  const ips = new Map(hosts.map((h, i) => [h, addresses[i]]));
  return { mx, ips };
}

/** The IPv4 addresses a domain's own (not shared) mail servers use. */
function serverIps(dns, domain) {
  const out = new Set();
  for (const host of dns.mx.get(domain) ?? []) {
    if (isShared(host)) continue;
    for (const ip of dns.ips.get(host) ?? []) out.add(ip);
  }
  return out;
}

/** Servers that carry at least MIN_LISTED listed domains and no normal domain. */
function learnServers(dns, listed, normalIps) {
  const counts = new Map();
  for (const domain of listed) {
    for (const ip of serverIps(dns, domain)) counts.set(ip, (counts.get(ip) ?? 0) + 1);
  }
  const servers = new Map();
  for (const [ip, count] of counts) {
    if (count >= MIN_LISTED && !normalIps.has(ip)) servers.set(ip, count);
  }
  return servers;
}

function flagged(dns, domain, servers) {
  for (const ip of serverIps(dns, domain)) if (servers.has(ip)) return true;
  return false;
}

async function previousMeta() {
  try {
    return JSON.parse(await readFile(new URL("meta.json", DATA), "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  const before = await previousMeta();
  const allow = await readAllow();

  log("downloading lists");
  const [psl, ...lists] = await Promise.all([
    get(PSL_URL).then(parsePsl),
    ...SOURCES.map((s) => get(s.url)),
  ]);

  const bits = new Map();
  const sourceCounts = {};
  let droppedPsl = 0;
  const pslExamples = [];
  let droppedAllow = 0;
  let droppedReserved = 0;
  const allowSet = new Set(allow.keys());
  SOURCES.forEach((source, i) => {
    let count = 0;
    for (const line of lists[i].split("\n")) {
      const domain = cleanDomain(line);
      if (!domain) continue;
      if (isReserved(domain)) {
        droppedReserved++;
        continue;
      }
      if (psl.has(domain)) {
        if (droppedPsl < 50) pslExamples.push(domain);
        droppedPsl++;
        continue;
      }
      if (listedWithParents(allowSet, domain)) {
        droppedAllow++;
        continue;
      }
      bits.set(domain, (bits.get(domain) ?? 0) | source.bit);
      count++;
    }
    sourceCounts[source.id] = count;
    const old = before?.sources?.find((s) => s.id === source.id)?.count;
    if (count < 500 || (old && count < old * 0.5)) {
      throw new Error(
        `${source.id}: only ${count} domains (was ${old ?? "?"}), refusing to update`,
      );
    }
  });
  const listed = [...bits.keys()].sort();
  log(
    `merged ${listed.length} domains (dropped ${droppedPsl} public suffixes, ${droppedAllow} allowed, ${droppedReserved} reserved)`,
  );
  log(`public suffixes dropped: ${[...new Set(pslExamples)].join(" ")}`);
  if (listed.length < 20000) throw new Error(`only ${listed.length} domains, refusing to update`);

  log("downloading the Tranco top list");
  const tranco = unzipFirst(await get(TRANCO_URL, "bytes"));
  const listedSet = new Set(listed);
  const control = [];
  for (const line of tranco.split("\n")) {
    const domain = cleanDomain(line.split(",")[1] ?? "");
    if (!domain || listedWithParents(listedSet, domain) || allow.has(domain)) continue;
    control.push(domain);
    if (control.length >= CONTROL_SIZE) break;
  }

  log("looking up the main list as it was", BACKTEST_DAYS, "days ago");
  const until = new Date(Date.now() - BACKTEST_DAYS * 86400_000).toISOString();
  const commits = await get(
    `https://api.github.com/repos/${MAIN_REPO}/commits?path=${MAIN_FILE}&until=${until}&per_page=1`,
    "json",
  );
  const oldSha = commits[0]?.sha;
  if (!oldSha) throw new Error("backtest: no older commit found");
  const oldMain = new Set(
    (await get(`https://raw.githubusercontent.com/${MAIN_REPO}/${oldSha}/${MAIN_FILE}`))
      .split("\n")
      .map(cleanDomain)
      .filter(Boolean),
  );
  const mainNow = listed.filter((d) => (bits.get(d) ?? 0) & 1);
  const added = mainNow.filter((d) => !oldMain.has(d));

  log(`DNS: ${listed.length} listed + ${control.length} popular domains`);
  const dns = await lookUp([...new Set([...listed, ...control, ...oldMain])]);
  const unanswered = [...dns.mx.values()].filter((v) => v === null).length;
  log(`DNS done (${unanswered} without an answer)`);

  // False alarms: learn "normal" servers from half of the popular sites, test on the other half.
  const even = control.filter((_, i) => i % 2 === 0);
  const odd = control.filter((_, i) => i % 2 === 1 && (dns.mx.get(control[i])?.length ?? 0) > 0);
  const evenIps = new Set(even.flatMap((d) => [...serverIps(dns, d)]));
  const evalServers = learnServers(dns, listed, evenIps);
  const falseAlarms = odd.filter((d) => flagged(dns, d, evalServers));
  const falseAlarmRate = falseAlarms.length / Math.max(1, odd.length);
  log(
    `false alarms: ${falseAlarms.length} of ${odd.length} (${(falseAlarmRate * 100).toFixed(2)}%): ${falseAlarms.join(" ")}`,
  );
  if (falseAlarmRate > MAX_FALSE_ALARM) {
    throw new Error(
      `false alarm rate ${falseAlarmRate} is above ${MAX_FALSE_ALARM}: ${falseAlarms.slice(0, 20)}`,
    );
  }

  // Backtest: learn only from the older main list, then test the domains it added since.
  const allNormalIps = new Set(control.flatMap((d) => [...serverIps(dns, d)]));
  const oldServers = learnServers(dns, [...oldMain], allNormalIps);
  const addedWithMail = added.filter((d) => (dns.mx.get(d)?.length ?? 0) > 0);
  const caught = addedWithMail.filter((d) => flagged(dns, d, oldServers));
  log(`backtest: ${caught.length} of ${addedWithMail.length} new domains (with mail) caught early`);

  // The real server list: learned from every list, minus servers any popular site uses.
  const servers = learnServers(dns, listed, allNormalIps);
  if (servers.size < 20 || servers.size > 5000) throw new Error(`odd server count ${servers.size}`);
  const mainWithAnswer = mainNow.filter((d) => dns.mx.get(d) !== null);
  const mainNoMail = mainWithAnswer.filter((d) => dns.mx.get(d)?.length === 0).length;

  const meta = {
    updated: new Date().toISOString().slice(0, 10),
    domains: listed.length,
    servers: servers.size,
    sources: SOURCES.map((s) => ({
      id: s.id,
      home: s.home,
      license: s.license,
      count: sourceCounts[s.id],
    })),
    tests: {
      falseAlarms: {
        about:
          "Popular websites (Tranco list) flagged by the mail-server check; never seen in training",
        flagged: falseAlarms.length,
        tested: odd.length,
      },
      backtest: {
        about: `Domains the main list added in the last ${BACKTEST_DAYS} days that last month's data would already have flagged`,
        since: until.slice(0, 10),
        added: added.length,
        withMail: addedWithMail.length,
        caught: caught.length,
      },
      mainListNoMail: {
        about: "Domains on the main list that can no longer receive mail (no MX record)",
        count: mainNoMail,
        of: mainWithAnswer.length,
      },
    },
  };

  const domainsTxt = listed.map((d) => `${d}\t${bits.get(d)}`).join("\n");
  const serversTxt = [...servers]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([ip, count]) => `${ip}\t${count}`)
    .join("\n");
  await writeFile(new URL("domains.txt", DATA), `${domainsTxt}\n`);
  await writeFile(new URL("servers.txt", DATA), `${serversTxt}\n`);
  await writeFile(new URL("meta.json", DATA), `${JSON.stringify(meta, null, 2)}\n`);
  log(`wrote ${listed.length} domains, ${servers.size} servers`);
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())
) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
