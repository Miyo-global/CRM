import { describe, it, expect, beforeAll, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { encryptSecret, decryptSecret, isEncrypted, hashToken } from "./secret-crypto";

describe("secret-crypto", () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = "test-encryption-key-for-vitest-0123456789abcdef";
  });

  it("roundtrips an encrypted secret", () => {
    const plain = "JBSWY3DPEHPK3PXP";
    const enc = encryptSecret(plain);
    expect(enc).not.toBe(plain);
    expect(isEncrypted(enc)).toBe(true);
    expect(decryptSecret(enc)).toBe(plain);
  });

  it("passes legacy plaintext through decryptSecret unchanged", () => {
    expect(decryptSecret("PLAINTEXTSECRET")).toBe("PLAINTEXTSECRET");
    expect(isEncrypted("PLAINTEXTSECRET")).toBe(false);
  });

  it("uses a random IV so ciphertext differs per call", () => {
    expect(encryptSecret("x")).not.toBe(encryptSecret("x"));
  });

  it("rejects tampered ciphertext (GCM auth tag)", () => {
    const enc = encryptSecret("secret");
    const tampered = enc.slice(0, -4) + (enc.endsWith("AAAA") ? "BBBB" : "AAAA");
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("hashToken is deterministic 64-char hex and differs per input", () => {
    const a = hashToken("reset-token-abc");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken("reset-token-abc")).toBe(a);
    expect(hashToken("reset-token-xyz")).not.toBe(a);
  });
});

// SEC-0017
describe("auth tag length", () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = "test-encryption-key-for-vitest-0123456789abcdef";
  });

  it("rejects a truncated authentication tag", () => {
    const prefix = "enc:v1:";
    const enc = encryptSecret("JBSWY3DPEHPK3PXP");
    const [ivB64, tagB64, ctB64] = enc.slice(prefix.length).split(":");
    const shortTag = Buffer.from(tagB64, "base64").subarray(0, 12).toString("base64");
    expect(() => decryptSecret(`${prefix}${ivB64}:${shortTag}:${ctB64}`)).toThrow(
      "Malformed encrypted secret",
    );
  });
});
