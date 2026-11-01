// Live checks against a running copy. Usage: npm run smoke [-- https://email.tooljar.dev]
const BASE = (process.argv[2] ?? "https://email.tooljar.dev").replace(/\/$/, "");
const BROWSER = {
  accept: "text/html,application/xhtml+xml",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/141.0 Safari/537.36",
};
const CURL = { accept: "*/*", "user-agent": "curl/8.22.0" };

let failed = 0;
async function expect(name, fn) {
  try {
    const problem = await fn();
    if (problem) throw new Error(problem);
    console.log(`ok   ${name}`);
  } catch (error) {
    failed++;
    console.log(`FAIL ${name}: ${error.message}`);
  }
}

const get = (path, headers = CURL) =>
  fetch(`${BASE}${path}`, { headers, redirect: "manual", signal: AbortSignal.timeout(15000) });
const word = async (path) => (await (await get(path)).text()).trim();

await expect("curl /mailinator.com says disposable", async () => {
  const w = await word("/mailinator.com");
  return w === "disposable" ? null : `got ${w}`;
});
await expect("curl /someone@yopmail.com says disposable", async () => {
  const w = await word("/someone@yopmail.com");
  return w === "disposable" ? null : `got ${w}`;
});
await expect("curl /gmail.com says ok", async () => {
  const w = await word("/gmail.com");
  return w === "ok" ? null : `got ${w}`;
});
await expect("curl /duck.com says ok (forwarding service)", async () => {
  const w = await word("/duck.com");
  return w === "ok" ? null : `got ${w}`;
});
await expect("curl /example.com says undeliverable", async () => {
  const w = await word("/example.com");
  return w === "undeliverable" ? null : `got ${w}`;
});
await expect("the live mail-server check works (DNS answered)", async () => {
  const r = await (await get("/api/check?q=gmail.com")).json();
  return r.mail?.checked && r.mail.servers.length > 0 ? null : JSON.stringify(r.mail);
});
await expect("JSON API: fields, CORS, Gmail clean-up", async () => {
  const res = await get("/api/check?q=John.Doe%2Btrial%40gmail.com");
  const r = await res.json();
  if (res.headers.get("access-control-allow-origin") !== "*") return "no CORS header";
  return r.normalized === "johndoe@gmail.com" && r.kind === "provider" ? null : JSON.stringify(r);
});
await expect("JSON API: 400 for junk", async () => {
  const res = await get("/api/check?q=hello");
  return res.status === 400 ? null : `status ${res.status}`;
});
for (const path of ["/", "/should-i-block-temp-mail", "/how-it-works", "/api", "/privacy"]) {
  await expect(`page ${path}`, async () => {
    const res = await get(path, BROWSER);
    const body = await res.text();
    if (res.status !== 200) return `status ${res.status}`;
    if (!body.includes(`<link rel="canonical" href="https://email.tooljar.dev${path}">`)) {
      return "no canonical link";
    }
    return res.headers.get("content-security-policy") ? null : "no CSP";
  });
}
await expect("a result page shows the verdict and is noindex", async () => {
  const body = await (await get("/?q=mailinator.com", BROWSER)).text();
  return body.includes('data-verdict="disposable"') && body.includes("noindex") ? null : "missing";
});
await expect("browsers opening /mailinator.com go to the checker", async () => {
  const res = await get("/mailinator.com", BROWSER);
  return res.status === 302 && res.headers.get("location")?.includes("/?q=mailinator.com")
    ? null
    : `status ${res.status}`;
});
for (const path of [
  "/robots.txt",
  "/sitemap.xml",
  "/llms.txt",
  "/.well-known/security.txt",
  "/favicon.svg",
]) {
  await expect(path, async () => {
    const res = await get(path);
    return res.status === 200 ? null : `status ${res.status}`;
  });
}
await expect("unknown page is 404", async () => {
  const res = await get("/nope", BROWSER);
  return res.status === 404 ? null : `status ${res.status}`;
});

console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
