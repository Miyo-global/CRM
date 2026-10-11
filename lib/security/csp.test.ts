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
