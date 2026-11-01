@AGENTS.md

# Claude Code — extra notes

The shared rules are in `AGENTS.md` (imported above). This part is only for Claude Code.

- **Browser:** Playwright screenshots go to `~/.cache/playwright-mcp`, never the repo. The Playwright profile `tooljar` is signed in to Cloudflare, Google Search Console and Bing Webmaster Tools.
- **Cloudflare:** the Worker is in the Cloudflare account "tooljar". Deploy by hand with `CLOUDFLARE_API_TOKEN_TOOLJAR` (see `AGENTS.md`).
- **Saba's standing approval (2026-11-01):** "use Playwright for everything token and stuff, I give you access". Agents may create narrow API tokens in the Playwright browser and store them as GitHub secrets (`gh secret set` from stdin, never printed). Saba does every login and 2FA himself.
