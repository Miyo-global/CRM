import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCsp } from "./csp";

const directive = (csp: string, name: string) =>
  csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";

describe("buildCsp", () => {
  it("never allows unsafe-eval outside development", () => {
    expect(buildCsp("production")).not.toContain("unsafe-eval");
    expect(buildCsp(undefined)).not.toContain("unsafe-eval");
  });

  it("blocks framing, plugins and foreign form targets", () => {
    const csp = buildCsp("production");
    expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(csp, "object-src")).toBe("object-src 'none'");
    expect(directive(csp, "form-action")).toBe("form-action 'self'");
  });

  it("does not allow arbitrary hosts", () => {
    const csp = buildCsp("production");
    expect(csp).not.toMatch(/(^|\s)(\*|https:|wss:)(\s|;|$)/);
  });

  it("does not allow websocket hosts now that chat is gone", () => {
    expect(directive(buildCsp("production"), "connect-src")).not.toContain("wss:");
  });

  it("keeps same-origin frames working for resume and offer-letter previews", () => {
    const frame = directive(buildCsp("production"), "frame-src");
    expect(frame.split(" ")).toContain("'self'");
  });

  it("lets the landing form load and frame Turnstile", () => {
    const csp = buildCsp("production");
    expect(directive(csp, "script-src")).toContain("https://challenges.cloudflare.com");
    expect(directive(csp, "frame-src")).toContain("https://challenges.cloudflare.com");
  });

  it("allows unsafe-eval in development for React refresh", () => {
    expect(directive(buildCsp("development"), "script-src")).toContain("'unsafe-eval'");
  });
});

describe("buildCsp with a nonce (MIYO-0132)", () => {
  it("drops unsafe-inline from script-src and uses strict-dynamic", () => {
    const scriptSrc = directive(buildCsp("production", "abc123"), "script-src");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).toContain("'nonce-abc123'");
    expect(scriptSrc).toContain("'strict-dynamic'");
  });

  it("still allows the Turnstile script", () => {
    expect(directive(buildCsp("production", "abc123"), "script-src")).toContain(
      "https://challenges.cloudflare.com",
    );
  });

  it("still frames the Turnstile challenge", () => {
    expect(directive(buildCsp("production", "abc123"), "frame-src")).toContain(
      "https://challenges.cloudflare.com",
    );
  });

  it("keeps every page dynamic so Next can stamp the nonce (QA-SEC-01)", () => {
    const layout = readFileSync("app/layout.tsx", "utf-8");
    expect(layout).toMatch(/await headers\(\)\)\.get\("x-nonce"\)/);
    expect(layout).toContain("nonce={nonce}");
    const proxy = readFileSync("proxy.ts", "utf-8");
    expect(proxy).toMatch(/buildCsp\(process\.env\.NODE_ENV, nonce\)/);
  });

  it("keeps unsafe-inline for styles, which are not nonced", () => {
    expect(directive(buildCsp("production", "abc123"), "style-src")).toContain("'unsafe-inline'");
  });

  it("keeps inline script out once a nonce is set, whatever style-src allows (FR1-035)", () => {
    const csp = buildCsp("production", "abc");
    expect(directive(csp, "script-src")).not.toContain("'unsafe-inline'");
    expect(directive(csp, "script-src")).toContain("'nonce-abc'");
    expect(directive(csp, "style-src")).not.toMatch(/(^|\s)(\*|https:)(\s|$)/);
  });
});
