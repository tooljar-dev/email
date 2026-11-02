// The shared page frame: <head> with all SEO tags, the header, the footer and the styles.
import { type Html, html, jsonLd, raw } from "./html";
import { JAR_LOGO } from "./icons";
import { SITE } from "./site";

export interface Page {
  path: string;
  /** The <title>: what shows in search results and the browser tab. */
  title: string;
  /** The meta description: the grey text under the title in search results. */
  description: string;
  body: Html;
  structuredData?: unknown[];
  status?: number;
  /** Pages that must stay out of search results (the 404 page). */
  noindex?: boolean;
}

const NAV: [string, string][] = [
  ["/", "Checker"],
  ["/should-i-block-temp-mail", "Block temp mail?"],
  ["/how-it-works", "How it works"],
  ["/api", "API"],
];

const STYLES = raw(`
:root{--bg:#fdf8f1;--surface:#fff;--surface-2:#fff4e3;--text:#1d2433;--muted:#566072;--border:#ecdfcb;--accent:#0f766e;--accent-ink:#fff;--accent-soft:#d7f3ee;--honey:#f59e0b;--honey-soft:#fde8bf;--ok:#15803d;--ok-soft:#dcfce7;--warn:#a85b06;--warn-soft:#fef3c7;--bad:#b91c1c;--bad-soft:#fee2e2;--code-bg:#1d2433;--code-text:#f6efe4;--radius:20px;--shadow:0 1px 2px rgb(80 50 10/6%),0 10px 30px rgb(80 50 10/7%);color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:#14161b;--surface:#1d2027;--surface-2:#252a33;--text:#eeebe6;--muted:#a7adb9;--border:#323844;--accent:#5eead4;--accent-ink:#082d29;--accent-soft:#113a35;--honey:#fbbf24;--honey-soft:#3b2e10;--ok:#4ade80;--ok-soft:#11321e;--warn:#fbbf24;--warn-soft:#3b2e10;--bad:#fb8a8a;--bad-soft:#3d1818;--code-bg:#0e1014;--shadow:none}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:17px/1.6 ui-rounded,"SF Pro Rounded","Segoe UI Variable Text","Segoe UI",system-ui,-apple-system,Roboto,"Helvetica Neue",Arial,sans-serif}
a{color:var(--accent);text-underline-offset:3px}
a:hover{text-decoration-thickness:2px}
:focus-visible{outline:3px solid var(--honey);outline-offset:2px;border-radius:6px}
.wrap{max-width:980px;margin:0 auto;padding:0 16px}
.skip{position:absolute;left:-999px}.skip:focus{left:16px;top:8px;background:var(--surface);padding:8px 12px;z-index:9}
header.top{padding:18px 0 8px}
.bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px 22px;justify-content:space-between}
.brand{display:flex;align-items:center;gap:9px;color:var(--text);text-decoration:none;font-weight:800;font-size:1.2rem;letter-spacing:-.01em}
.brand .pill{background:var(--accent);color:var(--accent-ink);border-radius:999px;padding:1px 10px;font-size:.85rem}
.logo-jar{flex:none}.logo-jar .lid{fill:var(--accent)}.logo-jar .jar{fill:var(--honey)}
nav ul{display:flex;flex-wrap:wrap;gap:4px;margin:0;padding:0;list-style:none}
nav a{display:block;padding:6px 12px;border-radius:999px;color:var(--muted);text-decoration:none;font-weight:600;font-size:.95rem}
nav a:hover{background:var(--surface-2);color:var(--text)}
nav a[aria-current=page]{background:var(--honey-soft);color:var(--text)}
main{padding:12px 0 40px}
h1{font-size:clamp(1.7rem,5vw,2.5rem);line-height:1.2;letter-spacing:-.02em;margin:18px 0 6px}
h2{font-size:1.45rem;line-height:1.3;margin:42px 0 10px;letter-spacing:-.01em}
h3{font-size:1.1rem;margin:22px 0 4px}
.lead{color:var(--muted);font-size:1.1rem;margin:0 0 20px;max-width:46em}
.hero{background:linear-gradient(135deg,var(--honey-soft),var(--surface-2));border:1px solid var(--border);border-radius:28px;padding:clamp(22px,5vw,40px);box-shadow:var(--shadow);margin:8px 0 22px}
.hero .label{font-weight:700;color:var(--muted);margin:0}
.ip{font-size:clamp(2.1rem,9vw,4.2rem);font-weight:800;line-height:1.1;letter-spacing:-.02em;margin:6px 0 16px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.ip.v6{font-size:clamp(1.35rem,4.6vw,2.5rem)}
.hero-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px}
.hero.has-map{display:grid;gap:22px 32px;align-items:center}
@media (min-width:860px){.hero.has-map{grid-template-columns:minmax(0,1fr) 300px}}
.hero-main{min-width:0}
.map{position:relative;margin:0;width:100%;max-width:300px;justify-self:center}
.map img{display:block;width:100%;height:auto}
.map .pin{position:absolute;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 3px var(--surface)}
@media (prefers-reduced-motion:no-preference){.map .pin::after{content:"";position:absolute;inset:-8px;border-radius:50%;border:2px solid var(--accent);animation:ping 2.4s ease-out infinite}}
@keyframes ping{from{transform:scale(.5);opacity:.9}to{transform:scale(1.9);opacity:0}}
.calm{display:flex;flex-wrap:wrap;gap:4px 18px;margin:16px 0 0;color:var(--muted);font-size:.92rem;font-weight:600}
.calm span::before{content:"✓ ";color:var(--ok)}
.chip{display:inline-flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--border);border-radius:999px;padding:4px 12px;font-size:.92rem;font-weight:600;overflow-wrap:anywhere}
.chip b{color:var(--accent)}
.btn{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:10px 20px;font:inherit;font-weight:700;background:var(--accent);color:var(--accent-ink);cursor:pointer;text-decoration:none}
.btn:hover{filter:brightness(1.08)}
.btn.ghost{background:var(--surface);color:var(--text);border:1px solid var(--border)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;box-shadow:var(--shadow);min-width:0}
.card-head{display:flex;align-items:center;gap:10px;color:var(--muted);font-weight:700;font-size:.92rem;margin-bottom:8px}
.badge{display:inline-grid;place-items:center;width:38px;height:38px;border-radius:12px;background:var(--accent-soft);color:var(--accent);flex:none}
.value{font-size:1.18rem;font-weight:700;overflow-wrap:anywhere;margin:0}
.sub{color:var(--muted);font-size:.95rem;margin:4px 0 0;overflow-wrap:anywhere}
details.ua{margin-top:8px;font-size:.88rem;color:var(--muted)}
details.ua summary{cursor:pointer}
details.ua code{display:block;margin-top:6px;overflow-wrap:anywhere}
.terminal{background:var(--code-bg);color:var(--code-text);border-radius:16px;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:12px 0}
.terminal code{font:600 1rem/1.5 ui-monospace,"Cascadia Code","SF Mono",Menlo,Consolas,monospace;overflow-wrap:anywhere}
.terminal .btn{padding:6px 14px;font-size:.9rem;background:#f6efe4;color:#1d2433}
pre{background:var(--code-bg);color:var(--code-text);border-radius:16px;padding:16px 18px;overflow-x:auto;font:.92rem/1.55 ui-monospace,"Cascadia Code","SF Mono",Menlo,Consolas,monospace}
code{font-family:ui-monospace,"Cascadia Code","SF Mono",Menlo,Consolas,monospace;font-size:.92em}
p code,li code,td code{background:var(--surface-2);border-radius:6px;padding:1px 6px}
.links{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin:14px 0}
.links a{display:flex;gap:12px;align-items:flex-start;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:14px 16px;color:var(--text);text-decoration:none}
.links a:hover{border-color:var(--accent)}
.links b{display:block}.links span.t{color:var(--muted);font-size:.92rem}
.faq details{background:var(--surface);border:1px solid var(--border);border-radius:16px;margin:10px 0;padding:2px 18px}
.faq summary{cursor:pointer;font-weight:700;padding:12px 28px 12px 0;list-style:none;position:relative}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";position:absolute;right:0;top:9px;font-size:1.3rem;color:var(--accent)}
.faq details[open] summary::after{content:"−"}
.faq details p{margin:0 0 14px;color:var(--text)}
table{width:100%;border-collapse:collapse;background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;display:block;overflow-x:auto}
th,td{text-align:left;padding:10px 14px;border-bottom:1px solid var(--border);vertical-align:top;overflow-wrap:anywhere}
th{font-size:.9rem;color:var(--muted);background:var(--surface-2)}
tr:last-child td{border-bottom:0}
.checks{display:grid;gap:12px}
.check{display:flex;gap:14px;align-items:flex-start;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:18px}
.check .dot{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-weight:800;background:var(--surface-2);color:var(--muted)}
.check[data-state=ok] .dot{background:var(--ok-soft);color:var(--ok)}
.check[data-state=warn] .dot{background:var(--warn-soft);color:var(--warn)}
.check[data-state=bad] .dot{background:var(--bad-soft);color:var(--bad)}
.check h3{margin:0 0 2px}.check p{margin:0;color:var(--muted)}
.note{background:var(--surface-2);border-radius:16px;padding:14px 18px;margin:16px 0}
article{max-width:46em}
footer{border-top:1px solid var(--border);padding:24px 0 40px;color:var(--muted);font-size:.93rem}
footer .cols{display:flex;flex-wrap:wrap;gap:8px 28px;justify-content:space-between}
footer ul{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:4px 16px}
footer p{margin:4px 0}
.ask{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0 6px}
.ask input{flex:1 1 260px;min-width:0;font:inherit;font-size:1.1rem;padding:12px 16px;border-radius:999px;border:1px solid var(--border);background:var(--surface);color:var(--text)}
.ask input:focus{outline:3px solid var(--honey);outline-offset:1px}
.ask .btn{padding:12px 24px;font-size:1.05rem}
.examples{color:var(--muted);font-size:.92rem;margin:4px 0 0}
.examples a{margin-right:10px}
.result{border-radius:var(--radius);border:1px solid var(--border);background:var(--surface);box-shadow:var(--shadow);padding:clamp(18px,4vw,28px);margin:18px 0}
.verdict{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;margin:0 0 6px}
.verdict .tag{border-radius:999px;padding:4px 14px;font-weight:800;font-size:1rem}
.verdict .what{font-size:clamp(1.3rem,4vw,1.8rem);font-weight:800;letter-spacing:-.01em;overflow-wrap:anywhere}
.result[data-verdict=disposable] .tag{background:var(--bad-soft);color:var(--bad)}
.result[data-verdict=suspicious] .tag,.result[data-verdict=undeliverable] .tag{background:var(--warn-soft);color:var(--warn)}
.result[data-verdict=ok] .tag{background:var(--ok-soft);color:var(--ok)}
.result[data-verdict=disposable]{border-color:var(--bad)}
.reasons{margin:12px 0 0;padding-left:1.2em}
.reasons li{margin:6px 0}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin:16px 0 0}
.facts div{background:var(--surface-2);border-radius:12px;padding:10px 14px;min-width:0}
.facts dt{color:var(--muted);font-size:.85rem;font-weight:700}
.facts dd{margin:2px 0 0;font-weight:700;overflow-wrap:anywhere}
.error{background:var(--warn-soft);border-radius:16px;padding:14px 18px;margin:16px 0}
@media (max-width:560px){body{font-size:16px}.hero{border-radius:22px}nav a{padding:5px 10px}}
`);

function analytics(token: string): Html {
  if (!token) return html``;
  return html`<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon="${JSON.stringify({ token })}"></script>`;
}

export function renderPage(page: Page, analyticsToken: string): string {
  const url = `${SITE.origin}${page.path}`;
  const nav = NAV.map(
    ([href, label]) =>
      html`<li><a href="${href}"${raw(href === page.path ? ' aria-current="page"' : "")}>${label}</a></li>`,
  );
  return html`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${page.title}</title>
<meta name="description" content="${page.description}">
${page.noindex ? raw('<meta name="robots" content="noindex">') : html`<link rel="canonical" href="${url}">`}
<meta name="theme-color" content="#fdf8f1" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#14161b" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.svg?v=2" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png?v=2" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE.name}">
<meta property="og:title" content="${page.title}">
<meta property="og:description" content="${page.description}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary">
<style>${STYLES}</style>
${(page.structuredData ?? []).map(jsonLd)}
${analytics(analyticsToken)}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="wrap bar">
<a class="brand" href="/" aria-label="tooljar Email, home">${JAR_LOGO}<span>tooljar</span><span class="pill">Email</span></a>
<nav aria-label="Main"><ul>${nav}</ul></nav>
</div></header>
<main id="main" class="wrap">
${page.body}
</main>
<footer><div class="wrap">
<div class="cols">
<div>
<p><strong>tooljar Email</strong> is part of <a href="https://tooljar.dev">tooljar.dev</a>: small, free, open-source tools.</p>
<p>Privacy: we don't store or log the addresses you check. No cookies and no ads.</p>
</div>
<ul>
<li><a href="/api">Free temp mail API</a></li>
<li><a href="/how-it-works">Data sources</a></li>
<li><a href="/privacy">Privacy</a></li>
<li><a href="https://ip.tooljar.dev">tooljar IP</a></li>
<li><a href="https://tooljar.dev">All tooljar tools</a></li>
<li><a href="${SITE.repo}">Source code on GitHub</a></li>
</ul>
</div>
</div></footer>
</body>
</html>
`.value;
}
