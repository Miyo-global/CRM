import { describe, expect, it } from "vitest";

import { normalizeLocale } from "./translations";

describe("normalizeLocale", () => {
  it("canonicalises the case, so one language is stored under one spelling", () => {
    expect(normalizeLocale("pt-br")).toBe("pt-BR");
    expect(normalizeLocale("EN")).toBe("en");
    expect(normalizeLocale(" fr-ca ")).toBe("fr-CA");
  });

  it("keeps a script and a region subtag", () => {
    expect(normalizeLocale("zh-hant-tw")).toBe("zh-Hant-TW");
  });

  it("rejects what is not a language tag", () => {
    expect(normalizeLocale("")).toBeNull();
    expect(normalizeLocale("not a locale")).toBeNull();
    expect(normalizeLocale("en_US")).toBeNull();
    expect(normalizeLocale("x".repeat(40))).toBeNull();
  });
});
