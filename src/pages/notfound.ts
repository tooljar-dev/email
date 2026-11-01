import { html } from "../html";
import type { Page } from "../layout";

export function notFoundPage(path: string): Page {
  return {
    path,
    title: "Page not found | tooljar Email",
    description: "This page does not exist.",
    status: 404,
    noindex: true,
    body: html`<h1>Page not found</h1>
<p class="lead">There is no page at <code>${path}</code>.</p>
<p><a class="btn" href="/">Go to the temp mail checker</a></p>`,
  };
}
