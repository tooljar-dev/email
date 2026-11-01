# tooljar Email: temp mail checker

**https://email.tooljar.dev** tells you whether an email address or domain is temp mail (a disposable address), and always says **why**. A free page and a free API. No key, no sign-up, free for commercial use.

```sh
curl email.tooljar.dev/mailinator.com
# disposable
```

## What it checks

1. **Five open lists, merged daily.** 78,799 temp mail domains. A subdomain counts when its parent is listed.
2. **The mail server, live.** Temp mail services change their domain names often but keep their mail servers. We learn which servers only temp mail domains use. A domain on such a server, but on no list, is **suspicious**.
3. **Gmail clean-up.** Gmail ignores dots and the `+` part, so `j.o.h.n+trial7@gmail.com` is really `john@gmail.com`. We show the real inbox.

The answer is one of:

| Verdict         | Meaning                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------- |
| `disposable`    | On at least one temp mail list.                                                               |
| `suspicious`    | On no list, but its mail server is one that only temp mail domains use. A warning, not proof. |
| `undeliverable` | The domain does not exist or cannot receive mail.                                             |
| `ok`            | None of the above.                                                                            |

Privacy forwarding services (DuckDuckGo, Firefox Relay, SimpleLogin, addy.io, Apple Hide My Email) are **not** temp mail here. They forward to a real inbox, even though some lists name them.

## API

```sh
curl email.tooljar.dev/someone@mailinator.com        # one word
curl "email.tooljar.dev/api/check?q=mailinator.com"  # JSON with the reasons
```

```js
const r = await fetch("https://email.tooljar.dev/api/check?q=" + encodeURIComponent(email)).then(
  (res) => res.json(),
);
// r.verdict, r.reasons[{ code, text }], r.lists, r.kind, r.mail, r.normalized
```

Full field list: https://email.tooljar.dev/api. Field names are stable: new fields may be added, none will be renamed or removed.

Fair use: up to 50 requests in 10 seconds per IP. For bulk checks, use the data files in `data/` directly.

## npm package

```sh
npm install is-temp-email
```

```js
import { isTempMail, normalizeEmail } from "is-temp-email";
isTempMail("someone@mailinator.com"); // true, offline, no network call
normalizeEmail("John.Doe+trial@gmail.com"); // "johndoe@gmail.com"
```

Built from the same data and rules (`npm/`, `scripts/build-npm.mjs`). A GitHub Action publishes a new version every Sunday when the data changed, through npm trusted publishing (no stored token).

## How accurate is it?

The daily job tests itself, and the numbers are on https://email.tooljar.dev/how-it-works:
- **False alarms:** the mail-server check is tested on popular websites it never saw. About 0.25% of them get flagged, mostly sites on shared web hosting. If the rate ever goes above 0.5%, the update stops and the old data stays.
- **Early catches:** of the domains the main list added in the last 30 days, last month's data would already have flagged about 23%.

## Data

| File               | What it is                                                                            |
| ------------------ | ------------------------------------------------------------------------------------- |
| `data/domains.txt` | The merged list: `domain<TAB>bits`. The bits say which lists name it.                 |
| `data/servers.txt` | Temp mail mail servers: `IPv4<TAB>number of listed domains on it`.                    |
| `data/meta.json`   | Counts, sources and the test results of the last update.                              |
| `data/allow.txt`   | Domains we never call temp mail (big providers, forwarding services). Edited by hand. |
| `data/LICENSES.md` | Where each list comes from, and its license.                                          |

`scripts/update-data.mjs` rebuilds the first three files. A GitHub Action runs it every day, runs the checks, commits the new data and deploys.

## Run it yourself

```sh
npm install
npm run data    # rebuild the data (about 2 minutes, many DNS lookups)
npm run dev     # local copy at http://localhost:8787
npm run check   # lint, types, tests, deploy dry run
```

It is one Cloudflare Worker in TypeScript, with no framework and no runtime dependencies.

## Found a mistake?

[Open an issue](https://github.com/tooljar-dev/email/issues) with the domain and why it is wrong. Security problems: see `SECURITY.md` or https://email.tooljar.dev/.well-known/security.txt.

## License

The code is MIT. The list data keeps its own licenses (CC0, MIT, BSD 3-Clause): see `data/LICENSES.md`.

Part of [tooljar.dev](https://ip.tooljar.dev): small, free, open-source tools.
