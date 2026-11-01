// Decides what to send back for addresses that serve both people and scripts ("/", "/headers").
// Browsers and search crawlers get the web page. curl, wget, scripts and apps get plain text,
// or JSON when they ask for it in the Accept header.

export type Format = "html" | "text" | "json";

// Crawlers and link-preview bots that may not send "Accept: text/html" but need the page,
// so that search results and shared links show the title and preview image.
// "google" catches Google's crawlers without "bot" in the name, such as Google-InspectionTool
// (Search Console's live test and "Request indexing") and GoogleOther. Before it was added,
// the live test got the plain-text IP and called the home page a "soft 404" (2026-10-31).
const PAGE_READERS =
  /bot\b|bot\/|crawler|spider|slurp|google|facebookexternalhit|facebookcatalog|embedly|preview|whatsapp|telegram|discord|slack|linkedin|pinterest|skype|mastodon|bluesky|lighthouse|pagespeed|validator/i;

export function pickFormat(request: Request): Format {
  const accept = (request.headers.get("accept") ?? "").toLowerCase();
  if (accept.includes("text/html")) return "html";
  if (accept.includes("application/json")) return "json";
  if (PAGE_READERS.test(request.headers.get("user-agent") ?? "")) return "html";
  return "text";
}
