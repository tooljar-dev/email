// Blocks shared by several pages: the answer card, the FAQ and its structured data.
import type { Result, Verdict } from "../check";
import { type Html, html } from "../html";
import { SITE } from "../site";

export interface Faq {
  q: string;
  a: string;
}

export function faqBlock(items: Faq[]): Html {
  return html`<div class="faq">${items.map(
    (f) => html`<details><summary>${f.q}</summary><p>${f.a}</p></details>`,
  )}</div>`;
}

export function faqData(items: Faq[]): unknown {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

const LABEL: Record<Verdict, string> = {
  disposable: "Temp mail",
  suspicious: "Suspicious",
  undeliverable: "Can't receive mail",
  ok: "No signs of temp mail",
};

function headline(r: Result): string {
  if (r.verdict === "disposable") return "This is a temp mail address.";
  if (r.verdict === "suspicious") return "Not on any list, but there is a warning sign.";
  if (r.verdict === "undeliverable") return "Mail to this address cannot be delivered.";
  if (r.kind === "provider") return "A normal email provider.";
  if (r.kind === "forwarding") return "A privacy forwarding service, not temp mail.";
  return "No signs of temp mail.";
}

function label(r: Result): string {
  if (r.verdict === "ok" && r.kind === "provider") return "Email provider";
  if (r.verdict === "ok" && r.kind === "forwarding") return "Forwarding service";
  return LABEL[r.verdict];
}

export function resultCard(r: Result, query: string): Html {
  const api = `/api/check?q=${encodeURIComponent(query)}`;
  return html`<section class="result" data-verdict="${r.verdict}" aria-labelledby="verdict">
<p class="verdict" id="verdict"><span class="tag">${label(r)}</span><span class="what">${r.email ?? r.domain}</span></p>
<p>${headline(r)}</p>
<ul class="reasons">${r.reasons.map((x) => html`<li>${x.text}</li>`)}</ul>
<dl class="facts">
<div><dt>Domain checked</dt><dd>${r.listed_as && r.listed_as !== r.domain ? `${r.domain} (listed as ${r.listed_as})` : r.domain}</dd></div>
<div><dt>Lists that name it</dt><dd>${r.lists.length ? `${r.lists.length} of ${r.data.lists}` : `0 of ${r.data.lists}`}</dd></div>
<div><dt>Mail server</dt><dd>${r.mail.checked ? (r.mail.servers[0] ?? (r.mail.can_receive ? "the domain itself" : "none")) : "not checked"}</dd></div>
${r.normalized ? html`<div><dt>Real inbox (dots and + removed)</dt><dd>${r.normalized}</dd></div>` : ""}
</dl>
<p class="sub">Same answer as JSON: <a href="${api}">${SITE.host}${api}</a></p>
</section>`;
}
