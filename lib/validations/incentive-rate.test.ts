import { describe, expect, it } from "vitest";
import {
  incentiveRateInputError,
  normalizeIncentiveRateString,
  parseIncentiveRate,
  sanitizeIncentiveRateInput,
  createIncentiveConfigBodySchema,
} from "./incentive-rate";

describe("sanitizeIncentiveRateInput", () => {
  it("limits to 2 decimal places while typing", () => {
    expect(sanitizeIncentiveRateInput("2.555")).toBe("2.55");
    expect(sanitizeIncentiveRateInput("12e5")).toBe("100");
    expect(sanitizeIncentiveRateInput("--5")).toBe("5");
    expect(sanitizeIncentiveRateInput("12.5")).toBe("12.5");
  });

  it("caps rate at 100", () => {
    expect(sanitizeIncentiveRateInput("150")).toBe("100");
    expect(sanitizeIncentiveRateInput("100.99")).toBe("100");
  });
});

describe("incentiveRateInputError", () => {
  it("accepts valid rates up to 2 decimals", () => {
    expect(incentiveRateInputError("2.5")).toBeNull();
    expect(incentiveRateInputError("2.50")).toBeNull();
    expect(incentiveRateInputError("100")).toBeNull();
  });

  it("rejects invalid formats", () => {
    expect(incentiveRateInputError("2.555")).toContain("2 decimal");
    expect(incentiveRateInputError("-1")).toContain("negative");
    expect(incentiveRateInputError("0")).toContain("greater than 0");
    expect(incentiveRateInputError("101")).toContain("100%");
  });
});

describe("createIncentiveConfigBodySchema", () => {
  it("normalizes valid rates for storage", () => {
    const result = createIncentiveConfigBodySchema.safeParse({ incentiveRate: "2.50" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.incentiveRate).toBe("2.50");
    }
  });

  it("rejects more than 2 decimal places", () => {
    expect(createIncentiveConfigBodySchema.safeParse({ incentiveRate: "2.555" }).success).toBe(false);
  });
});

describe("parseIncentiveRate", () => {
  it("parses valid values", () => {
    expect(parseIncentiveRate("2.5")).toBe(2.5);
    expect(normalizeIncentiveRateString("2.5")).toBe("2.5");
  });
});
