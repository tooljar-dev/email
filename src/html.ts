// A tiny HTML template helper. Every value put into html`...` is escaped, unless it is
// already HTML made by html`` or raw(). User-controlled text (like the user agent) is
// therefore safe by default.

export class Html {
  constructor(readonly value: string) {}
  toString(): string {
    return this.value;
  }
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function esc(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

/** Marks a trusted string as HTML. Only for strings we wrote ourselves. */
export function raw(value: string): Html {
  return new Html(value);
}

function render(value: unknown): string {
  if (value instanceof Html) return value.value;
  if (Array.isArray(value)) return value.map(render).join("");
  if (value === null || value === undefined || value === false) return "";
  return esc(String(value));
}

export function html(strings: TemplateStringsArray, ...values: unknown[]): Html {
  let out = strings[0] ?? "";
  values.forEach((value, i) => {
    out += render(value) + (strings[i + 1] ?? "");
  });
  return new Html(out);
}

/** JSON for a <script type="application/ld+json"> block, safe against "</script>" inside. */
export function jsonLd(data: unknown): Html {
  const text = JSON.stringify(data).replace(/</g, "\\u003c");
  return raw(`<script type="application/ld+json">${text}</script>`);
}
