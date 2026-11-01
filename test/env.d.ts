// Lets tests call the Worker with `exports.default.fetch()` from "cloudflare:workers".
declare namespace Cloudflare {
  interface Exports {
    default: Fetcher;
  }
}
