import { html } from "../html";
import type { Page } from "../layout";
import { SITE } from "../site";

export function privacyPage(): Page {
  return {
    path: "/privacy",
    title: "Privacy | tooljar Email",
    description:
      "What the temp mail checker does with the addresses you check: nothing is stored or logged. Only the domain goes to Cloudflare's DNS.",
    body: html`
<article>
<h1>Privacy</h1>
<p class="lead">Short version: we don't store or log the addresses you check. No cookies, no ads.</p>
<h2>What happens when you check an address</h2>
<ul>
<li>The address goes to our code on Cloudflare Workers, which builds the answer and then forgets it. We keep no request logs.</li>
<li>To check the mail server, we send <b>only the domain</b> (the part after the @) to Cloudflare's public DNS resolver, 1.1.1.1. Never the part before the @.</li>
<li>Pages with a result are marked “noindex”, so search engines don't list them.</li>
</ul>
<h2>Counting visits</h2>
<p>We may use Cloudflare Web Analytics to count page views. It sets no cookies and does not track you across sites.</p>
<h2>Who runs this</h2>
<p>tooljar Email is made and run by Saba Janelidze (<a href="https://www.sabajanelidze.com">sabajanelidze.com</a>). Contact: <a href="mailto:saba@tooljar.dev">saba@tooljar.dev</a>. The code is open source: <a href="${SITE.repo}">${SITE.repo.replace("https://", "")}</a>.</p>
</article>
`,
  };
}
