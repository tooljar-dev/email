import { DATA_META, SOURCES } from "../data";
import { html } from "../html";
import type { Page } from "../layout";
import { SITE } from "../site";

const n = (x: number) => x.toLocaleString("en-US");
const pct = (a: number, b: number) => `${((a / Math.max(1, b)) * 100).toFixed(2)}%`;

export function howPage(): Page {
  const t = DATA_META.tests;
  return {
    path: "/how-it-works",
    title: "How the temp mail checker works: data sources and accuracy | tooljar",
    description: `Where the data comes from (${SOURCES.length} open lists, ${n(DATA_META.domains)} domains), how the mail-server check finds new temp mail domains, and how often it is wrong.`,
    body: html`
<article>
<h1>How the checker works</h1>
<p class="lead">Three checks, all open source. The numbers on this page come from the last data update on ${DATA_META.updated}.</p>

<h2>1. Public lists</h2>
<p>Volunteers and companies keep open lists of temp mail domains. Every day we download ${SOURCES.length} of them and merge them into one list of ${n(DATA_META.domains)} domains. A subdomain counts when its parent domain is listed: if <code>mailinator.com</code> is listed, so is <code>x.mailinator.com</code>.</p>
<table>
<thead><tr><th>List</th><th>Domains</th><th>License</th></tr></thead>
<tbody>${SOURCES.map(
      (s) =>
        html`<tr><td><a href="${s.home}">${s.id}</a></td><td>${n(s.count)}</td><td>${s.license}</td></tr>`,
    )}</tbody>
</table>
<p>Before merging, we remove two kinds of entries:</p>
<ul>
<li><b>Whole public endings</b>, like <code>ddns.net</code> or <code>co.uk</code>. Some lists contain them, and they would block every user of a free dynamic DNS service. We check against the <a href="https://publicsuffix.org/">Public Suffix List</a>.</li>
<li><b>Normal providers and forwarding services</b>, from <a href="${SITE.repo}/blob/main/data/allow.txt">our allow list</a>. For example, one list names DuckDuckGo's <code>duck.com</code> and Firefox Relay's <code>mozmail.com</code>. Those forward mail to a real inbox, so we don't call them temp mail.</li>
</ul>

<h2>2. The mail-server check</h2>
<p>Temp mail services change their domain names often, but they keep the same mail servers. So every day we look up the mail server (the MX record) of every listed domain, and of the 20,000 most popular websites (the <a href="https://tranco-list.eu/">Tranco list</a>). A server becomes a “temp mail server” when it handles at least 3 listed domains and no popular website uses it. Shared mail services like Google, Microsoft and Cloudflare never count.</p>
<p>When you check a domain that is on no list, we look up its mail server live. If it is a temp mail server, the answer is “suspicious”.</p>
<p><b>How often is it wrong?</b> We learn the servers from half of the popular websites and test on the other half, which the check has never seen. In the last update it wrongly flagged <b>${n(t.falseAlarms.flagged)} of ${n(t.falseAlarms.tested)}</b> popular websites (${pct(t.falseAlarms.flagged, t.falseAlarms.tested)}). Most were on shared web hosting. That is why it says “suspicious”, never “temp mail”. If the rate ever goes above 0.5%, the daily update stops and the old data stays.</p>
<p><b>Does it catch new domains early?</b> We take the main list as it was on ${t.backtest.since} and learn servers from that alone. Since then the list added ${n(t.backtest.withMail)} domains that can receive mail. The old data would already have flagged <b>${n(t.backtest.caught)}</b> of them (${pct(t.backtest.caught, t.backtest.withMail)}), before any list knew them.</p>

<h2>3. Gmail clean-up</h2>
<p>Gmail ignores dots and everything after a <code>+</code>. So <code>j.o.h.n+trial7@gmail.com</code> lands in <code>john@gmail.com</code>. Some temp mail services use this with pools of real Gmail accounts. We show the real inbox, so you can see that many sign-ups are one person. Outlook, iCloud, Proton and Fastmail ignore the <code>+</code> part too.</p>

<h2>What the checker cannot see</h2>
<ul>
<li><b>Real Gmail or Outlook accounts</b> used as throwaways. They are normal accounts; only the clean-up above helps.</li>
<li><b>Private domains</b> that one person or one fraud group uses alone, on a mail server nobody else uses.</li>
<li><b>Brand-new services</b> on new servers, until a list or our server check learns them.</li>
<li><b>Whether the mailbox exists.</b> We check that the domain can receive mail, not that the person is real.</li>
</ul>
<p>The lists also go stale: ${n(t.mainListNoMail.count)} of the ${n(t.mainListNoMail.of)} domains on the main list (${pct(t.mainListNoMail.count, t.mainListNoMail.of)}) can no longer receive mail at all. We still call them temp mail, because that is what they were, and the answer says the domain cannot receive mail.</p>

<h2>Open data</h2>
<p>The merged list, the server list and these numbers are in <a href="${SITE.repo}/tree/main/data">the repository</a>, rebuilt every day by <a href="${SITE.repo}/blob/main/scripts/update-data.mjs">one script</a>. Found a mistake? <a href="${SITE.repo}/issues">Open an issue</a>.</p>
</article>
`,
  };
}
