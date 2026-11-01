# tooljar Email — Agent Instructions

The temp mail checker and free API at **https://email.tooljar.dev**: one Cloudflare Worker (TypeScript, no framework) that answers "is this address or domain temp mail, and why?". The second tool of tooljar.dev, after `../ip`. Public, MIT-licensed repo.

**This file is shared by every AI agent.** Claude Code reads it through `CLAUDE.md`. Codex reads it directly.

**Shared rules for all projects (maintainer's workspace):** `../../_shared/README.md`. 🔒 Locks there can't be overridden here.

## Start of every session

1. Read `../STATUS-email.md` (this tool's tracker; it lives outside this public repo on purpose). The research behind the tool is in `../research/` (`temp-mail.html`, `checker-plan.md`).
2. Run `git status` and `git log -3`. The daily data job commits to `main`, so pull first.

## End of every session

1. Update `../STATUS-email.md` (log, open problems, next steps).
2. Commit with the repo's commit style (see "Rules").
3. Ask Saba before pushing code changes and before deploying by hand. The daily data job deploys by itself (Saba's decision, 2026-11-01).

## Where things live

| Path                      | What it is                                                                                                                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/index.ts`            | Router: path checks (`/mailinator.com`), `/api/check`, pages, crawler files, headers (CSP, CORS)                                                                                                                               |
| `src/check.ts`            | The checker: input parsing, list and allow-list lookups, Gmail clean-up, the verdict and its reasons; the public JSON shape (`Result`)                                                                                         |
| `src/dns.ts`              | Live MX/A lookups through Cloudflare DNS over HTTPS (only the domain is sent)                                                                                                                                                  |
| `src/data.ts`             | Loads `data/*.txt` and `data/meta.json` at start-up                                                                                                                                                                            |
| `src/pages/`              | HTML pages; `parts.ts` has the result card and FAQ helpers                                                                                                                                                                     |
| `src/layout.ts`           | `<head>`, header, footer, all CSS (same look as `../ip`)                                                                                                                                                                       |
| `src/seo.ts`              | `PAGE_PATHS`, robots.txt, sitemap.xml, llms.txt, security.txt                                                                                                                                                                  |
| `data/`                   | The data: `domains.txt`, `servers.txt`, `meta.json` (generated), `allow.txt` (by hand), `LICENSES.md`                                                                                                                          |
| `scripts/update-data.mjs` | The daily data job: merge the lists, learn temp mail servers, test, write                                                                                                                                                      |
| `npm/`                    | The npm package `is-temp-email`: `index.js` (same rules as `src/check.ts`, keep them in step), `index.d.ts`, `test.mjs`, `README.md`. `data.js` and `package.json` are generated                                               |
| `scripts/build-npm.mjs`   | Builds the npm package from `data/`; version = published + 1 patch; `dataHash` skips unchanged data                                                                                                                            |
| `scripts/smoke.mjs`       | Live checks against a running copy                                                                                                                                                                                             |
| `.github/workflows/`      | `ci.yml` (checks on every push); `data.yml` (daily data, check, commit, deploy, smoke); `release.yml` (Sundays: publish `is-temp-email` to npm when the data changed, trusted publishing, environment `npm` limited to `main`) |

## Run, check, deploy

- `npm install`: once per machine.
- `npm run data`: rebuild the data (about 2 minutes, ~120,000 DNS lookups). It refuses to write when a list shrank by half, when fewer than 20,000 domains remain, or when false alarms go above 0.5%.
- `npm run dev`: local copy. `npm run check`: Biome, TypeScript, tests, deploy dry run. Run it before saying a code task is done.
- **Deploy by hand** (only with Saba's OK): `npm run cf:dry`, then `npx wrangler deploy --config wrangler.jsonc`, then `npm run smoke`. Auth: `CLOUDFLARE_API_TOKEN` from the tooljar token. PowerShell: `$env:CLOUDFLARE_API_TOKEN = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN_TOOLJAR','User')`.
- **Daily deploy:** `data.yml` uses the repo secret `CLOUDFLARE_API_TOKEN`, a separate token that can only edit Workers scripts in the tooljar account. It runs `wrangler versions upload` + `versions deploy`, which never touch DNS or routes. The custom domain was set by the first deploy by hand.

## Rules

- **Commits:** one line `type(scope): summary` (`feature`, `bugfix`, `refactor`, `docs`, `chore`), no body. The data job commits as `chore(data): daily update YYYY-MM-DD`.
- **API is a product:** paths and JSON field names are stable. Add fields, never rename or remove them. Update `README.md`, `src/pages/api.ts` and `llms.txt` together.
- **Every value in a page goes through the `html` template tag** (auto-escaped). Use `raw()` only for strings we wrote ourselves.
- **Verdict words are honest:** only list membership may say `disposable`. The mail-server check only ever says `suspicious`. Never present a guess as certain.
- **allow.txt:** add a domain only after checking its MX record and owner, and say why in the commit.
- **Privacy:** never log or store checked addresses. Only the domain may leave the Worker (to Cloudflare DNS). If that changes, update `/privacy` and the FAQ first and ask Saba.
- **New page:** add it to `PAGES` in `src/index.ts`, to `PAGE_PATHS` in `src/seo.ts`, to `scripts/smoke.mjs`, and bump `SITE.updated`.
- **Plain, simple words** in all docs and page texts.

## Overrides of the shared rules

- **Sentry: not used.** A tiny stateless Worker; errors show in `wrangler tail`.
- **The status file lives outside the repo** (`../STATUS-email.md`), because this repo is public.
