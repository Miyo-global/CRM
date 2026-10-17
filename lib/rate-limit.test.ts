import { describe, expect, it } from "vitest";
import { checkRateLimitShared, isSuspiciousBot, resolveTier, type CounterStore } from "./rate-limit";

function memoryStore(): CounterStore {
  const m = new Map<string, unknown>();
  return {
    async get<T>(k: string) { return (m.get(k) as T) ?? null; },
    async set(k: string, v: unknown) { m.set(k, v); return "OK"; },
    async incr(k: string) { const n = ((m.get(k) as number) ?? 0) + 1; m.set(k, n); return n; },
    async expire() { return 1; },
  };
}

describe("checkRateLimitShared (SEC-0003)", () => {
  it("two instances sharing one store share one budget", async () => {
    const store = memoryStore();
    const now = 1_000_000;
    let allowed = 0;
    for (let i = 0; i < 20; i++) {
      // alternate "instances": both only talk to the shared store
      const r = await checkRateLimitShared(store, "login", "1.2.3.4", now + i);
      if (r?.allowed) allowed++;
    }
    expect(allowed).toBe(10);
  });

  it("blocks progressively once the budget is spent", async () => {
    const store = memoryStore();
    for (let i = 0; i < 10; i++) await checkRateLimitShared(store, "login", "ip", 0);
    const blocked = await checkRateLimitShared(store, "login", "ip", 0);
    expect(blocked).toEqual({ allowed: false, retryAfterSecs: 60 });
  });

  it("returns null when the store is unreachable", async () => {
    const store = { ...memoryStore(), incr: async () => 0 };
    expect(await checkRateLimitShared(store, "login", "ip")).toBeNull();
  });
});

describe("isSuspiciousBot", () => {
  it.each([
    "sqlmap/1.7.2#stable (https://sqlmap.org)",
    "Mozilla/5.0 (compatible; Nuclei - Open-source project (github.com/projectdiscovery/nuclei))",
    "Mozilla/5.0 Nikto/2.5.0",
    "masscan/1.3",
    "Scrapy/2.11 (+https://scrapy.org)",
    "Mozilla/5.0 (compatible; GPTBot/1.0)",
  ])("blocks scanner or scraper %s", (ua) => {
    expect(isSuspiciousBot(ua)).toBe(true);
  });

  it("blocks an empty user agent by default", () => {
    expect(isSuspiciousBot(null)).toBe(true);
    expect(isSuspiciousBot("   ")).toBe(true);
  });

  it("allows an empty user agent when asked", () => {
    expect(isSuspiciousBot(null, { allowEmpty: true })).toBe(false);
    expect(isSuspiciousBot("", { allowEmpty: true })).toBe(false);
  });

  it("still blocks scanners when empty agents are allowed", () => {
    expect(isSuspiciousBot("sqlmap/1.7", { allowEmpty: true })).toBe(true);
  });

  it.each([
    "curl/8.7.1",
    "PostmanRuntime/7.39.0",
    "insomnia/2023.5.8",
    "python-requests/2.32.3",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  ])("allows developer and browser client %s", (ua) => {
    expect(isSuspiciousBot(ua)).toBe(false);
  });
});

describe("resolveTier", () => {
  it("rate-limits sign-up as account creation", () => {
    expect(resolveTier("/api/auth/signup")).toBe("account-create");
  });

  it("does not rate-limit NextAuth internals or page routes", () => {
    expect(resolveTier("/api/auth/csrf")).toBeNull();
    expect(resolveTier("/dashboard")).toBeNull();
  });

  it("rate-limits credential login", () => {
    expect(resolveTier("/api/auth/callback/credentials")).toBe("login");
  });
});
