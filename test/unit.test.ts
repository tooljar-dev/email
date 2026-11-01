import { describe, expect, it } from "vitest";
import { check, findAllowed, findListed, normalize, type Parsed, parseInput } from "../src/check";
import { DOMAINS, SERVERS, SOURCES } from "../src/data";
import { type MailDns, mxHosts } from "../src/dns";

const TEMP_IP = [...SERVERS.keys()][0] ?? "";
const OK_MAIL: MailDns = {
  exists: true,
  canReceive: true,
  hosts: ["mx.example.com"],
  ips: ["192.0.2.10"],
};

function parsed(input: string): Parsed {
  const p = parseInput(input);
  if (!p) throw new Error(`could not parse ${input}`);
  return p;
}

describe("data", () => {
  it("loads the merged list, the servers and five lists", () => {
    expect(DOMAINS.size).toBeGreaterThan(20000);
    expect(SERVERS.size).toBeGreaterThan(20);
    expect(SOURCES).toHaveLength(5);
    expect(TEMP_IP).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
  });
});

describe("parseInput", () => {
  it("splits an address and lower-cases it", () => {
    expect(parseInput("  John.Doe@Mail.Example.COM. ")).toEqual({
      email: "john.doe@mail.example.com",
      local: "john.doe",
      domain: "mail.example.com",
    });
  });
  it("takes a bare domain and mailto: links", () => {
    expect(parseInput("Example.org")).toEqual({ email: null, local: null, domain: "example.org" });
    expect(parseInput("mailto:a@example.org")?.domain).toBe("example.org");
  });
  it("turns international domains into their ASCII form", () => {
    expect(parseInput("bücher.de")?.domain).toBe("xn--bcher-kva.de");
  });
  it("refuses things that are not addresses or domains", () => {
    for (const bad of [
      "",
      "example",
      "a@",
      "@example.com",
      "1.2.3.4",
      "a b@example.com",
      "x".repeat(400),
    ]) {
      expect(parseInput(bad), bad).toBeNull();
    }
  });
});

describe("normalize", () => {
  it("removes Gmail dots and the + part", () => {
    expect(normalize("john.doe+news", "gmail.com")).toBe("johndoe@gmail.com");
    expect(normalize("j.o.h.n", "googlemail.com")).toBe("john@gmail.com");
  });
  it("removes only the + part where dots matter", () => {
    expect(normalize("a.b+x", "outlook.com")).toBe("a.b@outlook.com");
    expect(normalize("a.b", "outlook.com")).toBeNull();
  });
  it("leaves other providers alone", () => {
    expect(normalize("a+b", "example.com")).toBeNull();
  });
});

describe("lists", () => {
  it("finds a listed domain and its subdomains", () => {
    expect(findListed("mailinator.com")?.entry).toBe("mailinator.com");
    expect(findListed("x.y.mailinator.com")?.entry).toBe("mailinator.com");
    expect(findListed("example.com")).toBeNull();
  });
  it("knows providers and forwarding services", () => {
    expect(findAllowed("gmail.com")).toBe("provider");
    expect(findAllowed("duck.com")).toBe("forwarding");
    expect(findAllowed("example.com")).toBeNull();
  });
  it("never lists an allowed domain", () => {
    expect(DOMAINS.has("duck.com")).toBe(false);
    expect(DOMAINS.has("gmail.com")).toBe(false);
  });
});

describe("mxHosts", () => {
  it("sorts by priority and drops the trailing dot", () => {
    const out = mxHosts({
      Status: 0,
      Answer: [
        { type: 15, data: "20 mx2.example.com." },
        { type: 15, data: "10 MX1.example.com." },
      ],
    });
    expect(out).toEqual({ hosts: ["mx1.example.com", "mx2.example.com"], nullMx: false });
  });
  it("spots a null MX (the domain takes no mail)", () => {
    expect(mxHosts({ Status: 0, Answer: [{ type: 15, data: "0 ." }] }).nullMx).toBe(true);
  });
});

describe("check", () => {
  it("calls a listed domain disposable and names the lists", () => {
    const r = check(parsed("someone@mailinator.com"), OK_MAIL);
    expect(r.verdict).toBe("disposable");
    expect(r.disposable).toBe(true);
    expect(r.lists.length).toBeGreaterThan(0);
    expect(r.reasons.map((x) => x.code)).toContain("on_list");
  });
  it("says when only a parent domain is listed", () => {
    const r = check(parsed("x.mailinator.com"), OK_MAIL);
    expect(r.listed_as).toBe("mailinator.com");
    expect(r.reasons[0]?.text).toContain("parent domain mailinator.com");
  });
  it("calls an unlisted domain on a temp mail server suspicious", () => {
    const r = check(parsed("new-domain.example"), { ...OK_MAIL, ips: [TEMP_IP] });
    expect(r.verdict).toBe("suspicious");
    expect(r.mail.temp_mail_server).toBe(true);
    expect(r.disposable).toBe(false);
  });
  it("calls a missing domain undeliverable", () => {
    const r = check(parsed("nothing-here.example"), {
      exists: false,
      canReceive: false,
      hosts: [],
      ips: [],
    });
    expect(r.verdict).toBe("undeliverable");
    expect(r.reasons.map((x) => x.code)).toEqual(["no_domain"]);
  });
  it("calls a domain without a mail server undeliverable", () => {
    const r = check(parsed("example.org"), { exists: true, canReceive: false, hosts: [], ips: [] });
    expect(r.verdict).toBe("undeliverable");
  });
  it("keeps disposable when a listed domain also cannot receive mail", () => {
    const r = check(parsed("mailinator.com"), {
      exists: true,
      canReceive: false,
      hosts: [],
      ips: [],
    });
    expect(r.verdict).toBe("disposable");
    expect(r.reasons.map((x) => x.code)).toEqual(["on_list", "no_mail"]);
  });
  it("treats Gmail as a provider and shows the real inbox", () => {
    const r = check(parsed("John.Doe+trial@gmail.com"), OK_MAIL);
    expect(r.verdict).toBe("ok");
    expect(r.kind).toBe("provider");
    expect(r.normalized).toBe("johndoe@gmail.com");
  });
  it("treats forwarding services as ok, never suspicious", () => {
    const r = check(parsed("abc@duck.com"), { ...OK_MAIL, ips: [TEMP_IP] });
    expect(r.verdict).toBe("ok");
    expect(r.kind).toBe("forwarding");
  });
  it("uses the lists alone when DNS failed", () => {
    const r = check(parsed("example.com"), null);
    expect(r.verdict).toBe("ok");
    expect(r.mail.checked).toBe(false);
    expect(r.reasons.map((x) => x.code)).toEqual(["dns_failed"]);
  });
  it("explains a clean answer", () => {
    const r = check(parsed("example.com"), OK_MAIL);
    expect(r.verdict).toBe("ok");
    expect(r.reasons.map((x) => x.code)).toEqual(["nothing_found"]);
  });
});
