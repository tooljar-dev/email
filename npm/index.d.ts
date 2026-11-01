export interface OfflineResult {
  /** The domain checked, lower-case, in ASCII form (xn--… for international names). */
  domain: string;
  /** true when the domain, or one of its parent domains, is on a temp mail list. */
  disposable: boolean;
  /** The exact list entry: the domain itself or a parent domain. */
  listedAs: string | null;
  /** The names of the lists that name it. */
  lists: string[];
  /** "provider" for big email providers, "forwarding" for privacy forwarding services. */
  kind: "provider" | "forwarding" | null;
  /** Gmail and others: the real inbox (dots and +part removed), or null when nothing changes. */
  normalized: string | null;
}

export interface OnlineResult {
  email: string | null;
  domain: string;
  verdict: "disposable" | "suspicious" | "undeliverable" | "ok";
  disposable: boolean;
  reasons: { code: string; text: string }[];
  lists: string[];
  listed_as: string | null;
  kind: "provider" | "forwarding" | null;
  mail: {
    checked: boolean;
    exists: boolean | null;
    can_receive: boolean | null;
    servers: string[];
    temp_mail_server: boolean;
  };
  normalized: string | null;
  data: { updated: string; domains: number; lists: number };
}

/** Offline check. null when the input is not an email address or a domain. */
export function checkEmail(input: string): OfflineResult | null;
/** true when the address or domain is on a temp mail list. */
export function isTempMail(input: string): boolean;
/** The real inbox for Gmail and others, or null when nothing changes. */
export function normalizeEmail(input: string): string | null;
/** Asks https://email.tooljar.dev (adds the live mail-server check). */
export function checkOnline(
  input: string,
  options?: { signal?: AbortSignal },
): Promise<OnlineResult>;
/** The day the bundled lists were built (YYYY-MM-DD). */
export const dataUpdated: string;
