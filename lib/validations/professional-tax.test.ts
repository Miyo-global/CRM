import { describe, expect, it } from "vitest";
import { formatProfessionalTax, ptAmountSchema, updateProfessionalTaxSchema } from "./professional-tax";

describe("ptAmountSchema", () => {
  it.each([
    ["0", 0],
    ["200", 200],
    ["2500", 2500],
    ["200.5", 200.5],
    ["200.50", 200.5],
    [200, 200],
    [1.15, 1.15],
  ])("accepts %j as %j", (input, expected) => {
    expect(ptAmountSchema.parse(input)).toBe(expected);
  });

  it.each([[""], [null], [undefined]])("treats %j as not applicable (null)", (input) => {
    expect(ptAmountSchema.parse(input)).toBeNull();
  });

  it.each([
    "-1",
    "2501",
    "2500.01",
    "1e9",
    "abc",
    "200.555",
    " 200",
    "200 ",
    "   ",
    "NaN",
    "Infinity",
    "+200",
    "200,00",
    "₹200",
    "٢٠٠",
    -50,
    2501,
    200.555,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    true,
  ])("rejects %j", (input) => {
    expect(ptAmountSchema.safeParse(input).success).toBe(false);
  });

  it("explains each rejection in plain words", () => {
    const message = (v: unknown) => ptAmountSchema.safeParse(v).error?.issues[0]?.message;
    expect(message("-1")).toBe("Enter a valid amount (e.g. 200 or 200.50)");
    expect(message(-1)).toBe("PT cannot be negative");
    expect(message("2501")).toBe("PT cannot exceed ₹2,500 per month");
    expect(message(200.555)).toBe("Max 2 decimal places");
  });

  it("the PATCH body rejects unknown keys", () => {
    expect(updateProfessionalTaxSchema.safeParse({ professionalTax: "200", userId: "x" }).success).toBe(false);
  });
});

describe("formatProfessionalTax", () => {
  it("formats for review and profile screens", () => {
    expect(formatProfessionalTax(200)).toBe("₹200.00 / month");
    expect(formatProfessionalTax("1234.5")).toBe("₹1,234.50 / month");
    expect(formatProfessionalTax(0)).toBe("₹0.00 / month");
    expect(formatProfessionalTax(null)).toBe("Not applicable");
  });
});
