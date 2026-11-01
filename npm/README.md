# is-temp-mail

Is this email address temp mail (a disposable address)? An offline check against **78,000+ temp mail domains from 5 open lists**, merged and rebuilt from fresh data every week. No dependencies, no network call.

```sh
npm install is-temp-mail
```

```js
import { isTempMail, checkEmail, normalizeEmail } from "is-temp-mail";

isTempMail("someone@mailinator.com"); // true
isTempMail("someone@gmail.com"); // false
isTempMail("abc@duck.com"); // false: a forwarding service, not temp mail

checkEmail("a@x.mailinator.com");
// { domain: "x.mailinator.com", disposable: true, listedAs: "mailinator.com",
//   lists: ["disposable-email-domains", "mailchecker", …], kind: null, normalized: null }

normalizeEmail("John.Doe+trial@gmail.com"); // "johndoe@gmail.com": one real inbox
```

## What it does differently

- **Five lists in one**, with subdomains: if `mailinator.com` is listed, so is `x.mailinator.com`.
- **No false alarms on forwarding services.** DuckDuckGo, Firefox Relay, SimpleLogin, addy.io and Apple Hide My Email forward to a real inbox. Some lists call them temp mail; this package doesn't (`kind: "forwarding"`).
- **No whole public endings.** Entries like `ddns.net`, which would block every user of a free DNS service, are removed.
- **Gmail clean-up.** `normalizeEmail` removes Gmail's dots and the `+` part (and the `+` part for Outlook, iCloud, Proton, Fastmail). Use it to allow one free trial per real inbox.

## Online check (optional)

```js
import { checkOnline } from "is-temp-mail";

const r = await checkOnline("someone@new-temp-domain.com");
r.verdict; // "disposable" | "suspicious" | "undeliverable" | "ok"
r.reasons; // [{ code, text }]: always says why
```

This asks the free API at [email.tooljar.dev](https://email.tooljar.dev). It adds what an offline list can't know:
- **suspicious:** the domain is on no list, but its mail server is one that only temp mail domains use;
- **undeliverable:** the domain does not exist or cannot receive mail.

The API sends only the domain to DNS, and keeps no logs. Fair use: 50 requests in 10 seconds per IP.

## Suggested use

Flag temp mail, don't just block it: ask for an address the person keeps, and hold back free trials or credits until the address is confirmed. More in the guide [Should you block temp mail at sign-up?](https://email.tooljar.dev/should-i-block-temp-mail)

## Data and license

The code is MIT. The domain data comes from five open lists (CC0, MIT, BSD 3-Clause), credited in `DATA-LICENSES.md`. Source, data and the daily data job: https://github.com/tooljar-dev/email. Wrong answer? [Open an issue](https://github.com/tooljar-dev/email/issues).
