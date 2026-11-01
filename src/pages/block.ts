import { html } from "../html";
import type { Page } from "../layout";
import { SITE } from "../site";
import { type Faq, faqBlock, faqData } from "./parts";

const FAQ: Faq[] = [
  {
    q: "Is it legal to block temp mail addresses?",
    a: "Generally yes: you decide who can sign up for your service. If you block, say so plainly on the form, so honest people know what to do.",
  },
  {
    q: "Will blocking temp mail stop fake accounts?",
    a: "It stops the lazy ones. Determined abusers use real Gmail accounts, the Gmail dot trick or private domains. Combine the check with rate limits, the Gmail clean-up and a check before anything costly, like a free trial.",
  },
  {
    q: "Should I block DuckDuckGo, Firefox Relay or SimpleLogin addresses?",
    a: "We suggest not. They forward to the person's real inbox and last as long as the person wants. The people who use them are usually careful about privacy, not abusers.",
  },
];

export function blockPage(): Page {
  return {
    path: "/should-i-block-temp-mail",
    title: "Should you block temp mail at sign-up? A practical guide | tooljar",
    description:
      "When blocking disposable email addresses helps, when it hurts, and a simple approach: flag temp mail, clean up Gmail tricks, and protect free trials.",
    structuredData: [faqData(FAQ)],
    body: html`
<article>
<h1>Should you block temp mail at sign-up?</h1>
<p class="lead">Short answer: flag it, don't just block it. Block only where a fake account costs you something real.</p>

<h2>Why sites block temp mail</h2>
<ul>
<li><b>Free trials and bonuses.</b> A new address means a new trial. One person can take dozens.</li>
<li><b>Fake accounts in bulk.</b> Bots sign up with temp mail because it needs no account of its own.</li>
<li><b>You can't reach the person later.</b> The inbox is gone in an hour, so password resets and receipts go nowhere.</li>
</ul>

<h2>Why blocking can hurt</h2>
<ul>
<li><b>Careful people use it too.</b> Many just want to try your product without spam.</li>
<li><b>Lists make mistakes.</b> Some lists name privacy forwarding services (DuckDuckGo, Firefox Relay, SimpleLogin) or whole free DNS services. Blocking those turns away honest users.</li>
<li><b>It is easy to get around.</b> Real Gmail accounts, the Gmail dot trick and private domains pass every list.</li>
</ul>

<h2>A sensible approach</h2>
<ol>
<li><b>On “disposable”:</b> ask for an address they keep, and explain why in one sentence (“we send your receipt and password resets there”).</li>
<li><b>On “suspicious”:</b> let them in, but hold back the costly part (a trial, credits, a payout) until they confirm the address.</li>
<li><b>On “undeliverable”:</b> point out the typo. The domain cannot receive mail.</li>
<li><b>Always:</b> store the cleaned-up Gmail address (dots and <code>+</code> part removed) next to the one they typed, and allow one free trial per real inbox.</li>
</ol>
<pre>const r = await fetch("https://${SITE.host}/api/check?q=" + encodeURIComponent(email)).then((x) =&gt; x.json());

if (r.verdict === "disposable") return askForAnotherAddress();
if (r.verdict === "undeliverable") return showTypoHint();
const key = r.normalized ?? email.toLowerCase(); // one trial per real inbox
const trialAllowed = r.verdict === "ok" &amp;&amp; !(await trialUsed(key));</pre>

<h2>Questions</h2>
${faqBlock(FAQ)}

<p>Try any address on the <a href="/">temp mail checker</a>, or read <a href="/how-it-works">how it works</a>.</p>
</article>
`,
  };
}
