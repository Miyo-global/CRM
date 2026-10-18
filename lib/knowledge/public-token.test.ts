import { describe, expect, it } from "vitest";

import { generatePublicToken, hashPublicToken, publicShareUrl } from "./public-token";

describe("public share tokens", () => {
  it("mints 64 hex characters, different every time", () => {
    const a = generatePublicToken();
    const b = generatePublicToken();
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(a).not.toBe(b);
  });

  it("hashes to something that is not the token", () => {
    const token = generatePublicToken();
    const hash = hashPublicToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toBe(token);
    // Stable, so a lookup by hash finds the row.
    expect(hashPublicToken(token)).toBe(hash);
  });

  it("builds the share URL from the request origin", () => {
    expect(publicShareUrl("abc", "https://crm.example.test")).toBe(
      "https://crm.example.test/wiki/abc",
    );
    expect(publicShareUrl("abc", "https://crm.example.test/")).toBe(
      "https://crm.example.test/wiki/abc",
    );
  });
});
