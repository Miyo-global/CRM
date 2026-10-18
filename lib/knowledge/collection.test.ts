import { describe, expect, it } from "vitest";

import {
  COLLECTION_LIMIT_DEFAULT,
  COLLECTION_LIMIT_MAX,
  decodeCursor,
  encodeCursor,
  normalizeSearchTerms,
  parseLimit,
} from "./collection";

describe("collection cursor", () => {
  it("round-trips", () => {
    const cursor = { id: 42, value: "2026-10-18T10:00:00.000Z" };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it("round-trips a value containing a colon", () => {
    const cursor = { id: 7, value: "a:b:c" };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it("is null for junk rather than throwing", () => {
    for (const raw of [null, undefined, "", "!!!!", "Zm9v", Buffer.from("0:x").toString("base64url")]) {
      expect(decodeCursor(raw)).toBeNull();
    }
  });
});

describe("normalizeSearchTerms", () => {
  it("keeps at most eight terms", () => {
    const terms = normalizeSearchTerms("a b c d e f g h i j").split(" ");
    expect(terms).toHaveLength(8);
  });

  it("caps the length and collapses whitespace", () => {
    expect(normalizeSearchTerms("  leave   policy  ")).toBe("leave policy");
    expect(normalizeSearchTerms("x".repeat(500)).length).toBeLessThanOrEqual(200);
  });

  it("is empty for nothing", () => {
    expect(normalizeSearchTerms(null)).toBe("");
  });
});

describe("parseLimit", () => {
  it("defaults and accepts a sane value", () => {
    expect(parseLimit(null)).toBe(COLLECTION_LIMIT_DEFAULT);
    expect(parseLimit("10")).toBe(10);
    expect(parseLimit(String(COLLECTION_LIMIT_MAX))).toBe(COLLECTION_LIMIT_MAX);
  });

  it("rejects over the cap and nonsense", () => {
    expect(parseLimit("101")).toMatchObject({ error: expect.stringContaining("100") });
    expect(parseLimit("0")).toMatchObject({ error: expect.any(String) });
    expect(parseLimit("-3")).toMatchObject({ error: expect.any(String) });
    expect(parseLimit("abc")).toMatchObject({ error: expect.any(String) });
  });
});
