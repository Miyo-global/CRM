import { describe, it, expect } from "vitest";
import {
  hasMeaningfulContent,
  isAllowedName,
  isSimpleName,
  sanitizeSimpleName,
  sanitizeName,
  collapseSpaces,
  cleanRequiredText,
  cleanOptionalText,
  cleanRequiredName,
  cleanOptionalName,
  cleanOptionalSimpleName,
} from "./text-rules";

describe("hasMeaningfulContent", () => {
  it("is false for symbols-only / whitespace", () => {
    expect(hasMeaningfulContent("!@#$%")).toBe(false);
    expect(hasMeaningfulContent("   ")).toBe(false);
    expect(hasMeaningfulContent("---")).toBe(false);
  });
  it("is true when a letter or digit is present", () => {
    expect(hasMeaningfulContent("Taxi 42")).toBe(true);
    expect(hasMeaningfulContent("9")).toBe(true);
  });
});

describe("collapseSpaces", () => {
  it("collapses runs of whitespace and trims", () => {
    expect(collapseSpaces("  a   b\t c  ")).toBe("a b c");
  });
});

describe("cleanRequiredText", () => {
  const s = cleanRequiredText("Merchant", 20);

  it("rejects empty and symbols-only values", () => {
    expect(s.safeParse("").success).toBe(false);
    expect(s.safeParse("!!!").success).toBe(false);
  });
  it("rejects over-long values", () => {
    expect(s.safeParse("x".repeat(21)).success).toBe(false);
  });
  it("accepts and normalises valid values", () => {
    const r = s.safeParse("  Uber   Eats ");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("Uber Eats");
  });
});

describe("cleanOptionalText", () => {
  const s = cleanOptionalText("Description", 10);

  it("allows empty", () => {
    expect(s.safeParse("").success).toBe(true);
    expect(s.safeParse(undefined).success).toBe(true);
  });
  it("rejects symbols-only when present", () => {
    expect(s.safeParse("****").success).toBe(false);
  });
  it("rejects over-long", () => {
    expect(s.safeParse("abcdefghijk").success).toBe(false);
  });
  it("normalises a valid value", () => {
    const r = s.safeParse("a   b");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("a b");
  });
});

describe("isAllowedName", () => {
  it("accepts names with letters, numbers, spaces and safe punctuation", () => {
    expect(isAllowedName("Books")).toBe(true);
    expect(isAllowedName("Meals & Entertainment")).toBe(true);
    expect(isAllowedName("Travel (local)")).toBe(true);
    expect(isAllowedName("R&D - 2026")).toBe(true);
  });
  it("rejects symbol soup", () => {
    expect(isAllowedName("BOOKS adf _))@*&(@")).toBe(false);
    expect(isAllowedName("abc@#$%")).toBe(false);
    expect(isAllowedName("name<script>")).toBe(false);
  });
});

describe("cleanRequiredName / cleanOptionalName", () => {
  const req = cleanRequiredName("Category", 60);
  const opt = cleanOptionalName("Category", 60);

  it("rejects the reported junk value", () => {
    expect(req.safeParse("BOOKS adf _))@*&(@").success).toBe(false);
    expect(opt.safeParse("BOOKS adf _))@*&(@").success).toBe(false);
  });
  it("accepts a clean category and normalises spaces", () => {
    const r = req.safeParse("  Office   Supplies ");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("Office Supplies");
  });
  it("required rejects empty; optional allows empty", () => {
    expect(req.safeParse("").success).toBe(false);
    expect(opt.safeParse("").success).toBe(true);
    expect(opt.safeParse(undefined).success).toBe(true);
  });
  it("rejects symbols-only and over-long values", () => {
    expect(req.safeParse("@@@").success).toBe(false);
    expect(req.safeParse("a".repeat(61)).success).toBe(false);
  });
});

describe("isSimpleName / sanitizeSimpleName", () => {
  it("allows letters, numbers, spaces and only - . '", () => {
    expect(isSimpleName("Cash")).toBe(true);
    expect(isSimpleName("Card - 1")).toBe(true);
    expect(isSimpleName("Amazon.com")).toBe(true);
    expect(isSimpleName("O'Brien")).toBe(true);
  });
  it("rejects + & ( ) and other special characters", () => {
    expect(isSimpleName("_+@@")).toBe(false);
    expect(isSimpleName("Tax + GST")).toBe(false);
    expect(isSimpleName("Meals & Entertainment")).toBe(false);
    expect(isSimpleName(")+()&&&&")).toBe(false);
  });
  it("strips disallowed characters as typed", () => {
    expect(sanitizeSimpleName(")+()&&&&")).toBe("");
    expect(sanitizeSimpleName("Books adf _))@*&(@")).toBe("Books adf ");
    expect(sanitizeSimpleName("UPI-2026")).toBe("UPI-2026");
  });
});

describe("sanitizeName (merchant-style)", () => {
  it("keeps common name punctuation, strips junk symbols", () => {
    expect(sanitizeName("Amazon.com")).toBe("Amazon.com");
    expect(sanitizeName("AT&T (US)")).toBe("AT&T (US)");
    expect(sanitizeName("McDonald's")).toBe("McDonald's");
    expect(sanitizeName("Shop @#$% 100")).toBe("Shop  100");
  });
});

describe("cleanOptionalSimpleName", () => {
  const s = cleanOptionalSimpleName("Payment method", 60);
  it("rejects the reported junk and other punctuation", () => {
    expect(s.safeParse("_+@@").success).toBe(false);
    expect(s.safeParse("Meals & Entertainment").success).toBe(false);
  });
  it("accepts plain names plus - . '", () => {
    expect(s.safeParse("Bank transfer").success).toBe(true);
    expect(s.safeParse("Card - 2").success).toBe(true);
    expect(s.safeParse("").success).toBe(true);
  });
});
