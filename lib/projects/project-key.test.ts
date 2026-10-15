import { describe, expect, it } from "vitest";
import { keyWithSuffix, projectKeySchema, suggestProjectKey } from "./project-key";

describe("projectKeySchema", () => {
  it("uppercases and accepts valid keys", () => {
    expect(projectKeySchema.parse(" web ")).toBe("WEB");
    expect(projectKeySchema.parse("A1")).toBe("A1");
  });

  it.each(["A", "1AB", "AB-1", "ABCDEFGHIJK", ""])("rejects %s", (key) => {
    expect(projectKeySchema.safeParse(key).success).toBe(false);
  });
});

describe("suggestProjectKey", () => {
  it("uses initials for multi-word names", () => {
    expect(suggestProjectKey("Website Redesign Project")).toBe("WRP");
  });

  it("uses the first letters of a single word", () => {
    expect(suggestProjectKey("Mobile")).toBe("MOBIL");
  });

  it("falls back when the name has too few letters", () => {
    expect(suggestProjectKey("!")).toBe("PRJ");
  });

  it("always produces a valid key", () => {
    for (const name of ["9 lives", "a b", "Ünïcode name", "x"]) {
      expect(projectKeySchema.safeParse(suggestProjectKey(name)).success).toBe(true);
    }
  });
});

describe("keyWithSuffix", () => {
  it("keeps the key within 10 characters", () => {
    expect(keyWithSuffix("WEB", 2)).toBe("WEB2");
    expect(keyWithSuffix("ABCDEFGHIJ", 12)).toBe("ABCDEFGH12");
  });
});
