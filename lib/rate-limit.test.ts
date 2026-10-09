import { describe, expect, it } from "vitest";
import { isSuspiciousBot, resolveTier } from "./rate-limit";

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
