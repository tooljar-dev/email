import { html } from "../html";
import type { Page } from "../layout";
import { SITE } from "../site";

const EXAMPLE = `{
  "email": "john.doe+news@gmail.com",
  "domain": "gmail.com",
  "verdict": "ok",
  "disposable": false,
  "reasons": [
    { "code": "known_provider", "text": "A well-known email provider. Not temp mail." }
  ],
  "lists": [],
  "listed_as": null,
  "kind": "provider",
  "mail": {
    "checked": true,
    "exists": true,
    "can_receive": true,
    "servers": ["gmail-smtp-in.l.google.com", "…"],
    "temp_mail_server": false
  },
  "normalized": "johndoe@gmail.com",
  "data": { "updated": "2026-11-01", "domains": 78800, "lists": 5 }
}`;

export function apiPage(): Page {
  const h = SITE.host;
  return {
    path: "/api",
    title: "Free disposable email API: check temp mail with one request | tooljar",
    description:
      "A free API that tells you whether an email address or domain is temp mail, with the reasons. Plain text or JSON, no key, CORS enabled, free for commercial use.",
    body: html`
<article>
<h1>Free temp mail API</h1>
<p class="lead">Ask about an email address or a domain. Get one word, or JSON with the reasons. No key, no sign-up, CORS on, free for commercial use.</p>

<h2>One word, for scripts</h2>
<div class="terminal"><code>curl ${h}/mailinator.com</code></div>
<p>Answers <code>disposable</code>, <code>suspicious</code>, <code>undeliverable</code> or <code>ok</code>, then a new line. A full address works too: <code>curl ${h}/someone@mailinator.com</code>.</p>

<h2>JSON, with the reasons</h2>
<div class="terminal"><code>curl "${h}/api/check?q=john.doe%2Bnews@gmail.com"</code></div>
<p><code>q</code> takes an address or a domain. <code>email=</code> and <code>domain=</code> work as other names for it.</p>
<pre>${EXAMPLE}</pre>

<h2>The fields</h2>
<table>
<thead><tr><th>Field</th><th>What it means</th></tr></thead>
<tbody>
<tr><td><code>verdict</code></td><td><code>disposable</code>: on a temp mail list. <code>suspicious</code>: on no list, but its mail server is one that temp mail services use. <code>undeliverable</code>: the domain does not exist or cannot receive mail. <code>ok</code>: none of these.</td></tr>
<tr><td><code>disposable</code></td><td><code>true</code> only when <code>verdict</code> is <code>disposable</code>.</td></tr>
<tr><td><code>reasons</code></td><td>Why, as a list of <code>{ code, text }</code>. Codes: <code>on_list</code>, <code>temp_mail_server</code>, <code>no_domain</code>, <code>no_mail</code>, <code>known_provider</code>, <code>forwarding_service</code>, <code>dns_failed</code>, <code>nothing_found</code>.</td></tr>
<tr><td><code>lists</code>, <code>listed_as</code></td><td>Which public lists name the domain, and the exact entry (the domain or a parent domain).</td></tr>
<tr><td><code>kind</code></td><td><code>provider</code> (Gmail, Outlook…), <code>forwarding</code> (DuckDuckGo, Firefox Relay, SimpleLogin…) or <code>null</code>.</td></tr>
<tr><td><code>mail</code></td><td>The live mail-server check. <code>checked</code> is <code>false</code> when DNS did not answer in time; then only the lists were used.</td></tr>
<tr><td><code>normalized</code></td><td>For Gmail and some other providers: the address with dots and the <code>+</code> part removed, or <code>null</code> when nothing changes.</td></tr>
<tr><td><code>data</code></td><td>When the lists were last updated, and how many domains they hold.</td></tr>
</tbody>
</table>
<p>The field names stay stable. New fields may be added; none will be renamed or removed.</p>

<h2>From a web page</h2>
<pre>const res = await fetch("https://${h}/api/check?q=" + encodeURIComponent(email));
const { verdict, reasons } = await res.json();
if (verdict === "disposable") showHint("Please use an address you keep.");</pre>

<h2>Errors</h2>
<p>Something that is not an address or a domain gets HTTP 400 and <code>{ "error": "…" }</code>.</p>

<h2>Fair use</h2>
<p>Up to 50 requests in 10 seconds per IP, then HTTP 429 for 10 seconds. For steady use, about one request a second. For bulk checks, run the lists yourself: everything is open source, and the data files are in the repository.</p>

<h2>Privacy</h2>
<p>We don't log or store what you check. The mail-server check sends only the domain to Cloudflare's public DNS (1.1.1.1). See <a href="/privacy">privacy</a>.</p>
</article>
`,
  };
}
