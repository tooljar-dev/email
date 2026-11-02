import type { Result } from "../check";
import { DATA_META, SOURCES } from "../data";
import { html } from "../html";
import { ICONS } from "../icons";
import type { Page } from "../layout";
import { SITE } from "../site";
import { type Faq, faqBlock, faqData, resultCard } from "./parts";

export type Outcome = { result: Result } | { error: string } | null;

const n = (x: number) => x.toLocaleString("en-US");

const FAQ: Faq[] = [
  {
    q: "What is a temp mail address?",
    a: "A throwaway email address from a site like Mailinator or temp-mail.org. It needs no sign-up, lives for minutes or hours, and anyone with the link (or sometimes anyone at all) can read its inbox. People use it to avoid spam. It is also the easiest way to make many fake accounts.",
  },
  {
    q: "What does “suspicious” mean?",
    a: "The domain is on no list, but its mail server also handles several known temp mail domains and no popular website uses that server. Temp mail services change their domain names often but keep their servers, so this catches new domains early. It can be wrong (for example on shared web hosting), so treat it as a warning, not proof.",
  },
  {
    q: "Why are DuckDuckGo, Firefox Relay and SimpleLogin addresses “ok” here?",
    a: "They are privacy forwarding services: the address forwards to the person's real inbox and lasts as long as they want. Some lists call them temp mail. We don't, because blocking them mostly hurts careful, honest people.",
  },
  {
    q: "Should I block temp mail when people sign up?",
    a: "Usually flag it rather than block it: ask for another address, or add a check before free trials. Our guide explains the trade-offs.",
  },
  {
    q: "Do you store the addresses I check?",
    a: "No. We don't log or store them. To check the mail server we send only the domain (the part after the @) to Cloudflare's public DNS resolver 1.1.1.1.",
  },
  {
    q: "Can I use the API in my product?",
    a: "Yes, it is free, needs no key, and commercial use is allowed. Please stay within the fair-use limit on the API page.",
  },
  {
    q: "A domain is wrong. How do I report it?",
    a: "Open an issue on GitHub with the domain and why it is wrong. For list entries we also tell the list's maintainers, because the data comes from public lists.",
  },
];

export function homePage(query: string, outcome: Outcome): Page {
  const value = query;
  return {
    path: "/",
    title: "Temp mail checker: is this email address disposable? | tooljar",
    description: `Free temp mail checker. Paste an email address or domain: we check ${n(DATA_META.domains)} disposable email domains from ${SOURCES.length} public lists and the mail server, and tell you why. Free API, no sign-up.`,
    noindex: query !== "",
    structuredData: [
      // The site name Google shows above the result (same as ip.tooljar.dev does).
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE.name,
        url: `${SITE.origin}/`,
      },
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "tooljar temp mail checker",
        url: `${SITE.origin}/`,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Any",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
      faqData(FAQ),
    ],
    body: html`
<h1>Temp mail checker</h1>
<p class="lead">Is this email address disposable? Paste an address or a domain. We check ${n(DATA_META.domains)} temp mail domains from ${SOURCES.length} public lists (updated daily) and look at the domain's mail server. Every answer says why.</p>
<form class="ask" method="get" action="/" role="search">
<label class="skip" for="q">Email address or domain</label>
<input id="q" name="q" type="text" inputmode="email" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="name@example.com or example.com" value="${value}" required>
<button class="btn" type="submit">Check</button>
</form>
<p class="examples">Try: <a href="/?q=mailinator.com">mailinator.com</a> <a href="/?q=duck.com">duck.com</a> <a href="/?q=john.doe%2Bnews%40gmail.com">john.doe+news@gmail.com</a></p>
${outcome && "error" in outcome ? html`<p class="error" role="alert">${outcome.error}</p>` : ""}
${outcome && "result" in outcome ? resultCard(outcome.result, query) : ""}

<h2>What the checker looks at</h2>
<div class="grid">
<div class="card"><div class="card-head"><span class="badge">${ICONS.list}</span>Public lists</div><p class="value">${n(DATA_META.domains)} domains</p><p class="sub">Merged from ${SOURCES.length} open lists every day. A subdomain counts when its parent domain is listed.</p></div>
<div class="card"><div class="card-head"><span class="badge">${ICONS.server}</span>Mail server</div><p class="value">${n(DATA_META.servers)} temp mail servers</p><p class="sub">Servers that only temp mail domains use. New domains on them show as “suspicious”.</p></div>
<div class="card"><div class="card-head"><span class="badge">${ICONS.at}</span>Gmail clean-up</div><p class="value">j.o.h.n+x@gmail.com</p><p class="sub">Gmail ignores dots and the + part. We show the real inbox, so 100 “different” addresses become one.</p></div>
</div>

<h2>For developers</h2>
<p>One word back, for scripts: <code>disposable</code>, <code>suspicious</code>, <code>undeliverable</code> or <code>ok</code>.</p>
<div class="terminal"><code>curl ${SITE.host}/mailinator.com</code></div>
<p>Or JSON with all the reasons: <a href="/api">the free API</a>. No key, CORS on, free for commercial use.</p>

<h2>Questions</h2>
${faqBlock(FAQ)}
`,
  };
}
