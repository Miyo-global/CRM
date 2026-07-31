import { describe, expect, it } from "vitest";
import {
  BONUS_MAX_AMOUNT,
  BONUS_OTHER_REASON_MAX,
  BONUS_TYPE_VALUES,
  bonusAmountInputError,
  bonusAmountSchema,
  bonusOtherReasonInputError,
  bonusOtherReasonSchema,
  createBonusBodySchema,
  isBonusAmountWithinLimit,
  isBonusType,
  normalizeBonusType,
  parseBonusAmount,
  validateCreateBonusForm,
  sanitizeBonusAmountInput,
  sanitizeBonusOtherReasonInput,
} from "./bonus";

describe("bonusAmountSchema", () => {
  it("accepts amounts up to 1 lakh", () => {
    expect(bonusAmountSchema.safeParse(100_000).success).toBe(true);
    expect(bonusAmountSchema.safeParse(1).success).toBe(true);
    expect(bonusAmountSchema.safeParse(12.5).success).toBe(true);
  });

  it("rejects amounts above 1 lakh", () => {
    expect(bonusAmountSchema.safeParse(100_001).success).toBe(false);
    expect(bonusAmountSchema.safeParse(213712313123).success).toBe(false);
  });
});

describe("normalizeBonusType", () => {
  it("accepts enum values and display labels", () => {
    expect(normalizeBonusType("PERFORMANCE")).toBe("PERFORMANCE");
    expect(normalizeBonusType("performance")).toBe("PERFORMANCE");
    expect(normalizeBonusType("Other")).toBe("OTHER");
    expect(normalizeBonusType("invalid")).toBeNull();
  });

  it("identifies valid bonus types", () => {
    for (const value of BONUS_TYPE_VALUES) {
      expect(isBonusType(value)).toBe(true);
    }
    expect(isBonusType("SPOT BONUS")).toBe(false);
  });
});

describe("createBonusBodySchema", () => {
  it("validates a complete bonus payload", () => {
    expect(
      createBonusBodySchema.safeParse({
        userId: "user-1",
        type: "PERFORMANCE",
        amount: 50_000,
      }).success,
    ).toBe(true);
  });

  it("coerces string amounts before validation", () => {
    const result = createBonusBodySchema.safeParse({
      userId: "user-1",
      type: "PERFORMANCE",
      amount: "50000.25",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(50000.25);
    }
  });

  it("strips reason when type is not Other", () => {
    const result = createBonusBodySchema.safeParse({
      userId: "user-1",
      type: "SPOT",
      amount: 1_000,
      reason: "Q4 target",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBeUndefined();
    }
  });

  it("ignores invalid reason when type is not Other", () => {
    const result = createBonusBodySchema.safeParse({
      userId: "user-1",
      type: "SPOT",
      amount: 1_000,
      reason: "Award @#$",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBeUndefined();
    }
  });

  it("normalizes bonus type labels before validation", () => {
    expect(
      createBonusBodySchema.safeParse({
        userId: "user-1",
        type: "Spot",
        amount: 1_000,
      }).success,
    ).toBe(true);
  });

  it("rejects invalid bonus types with a clear message", () => {
    const result = createBonusBodySchema.safeParse({
      userId: "user-1",
      type: "Spot Bonus",
      amount: 1_000,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "type")).toBe(true);
    }
  });

  it("requires a simple reason when type is Other", () => {
    expect(
      createBonusBodySchema.safeParse({
        userId: "user-1",
        type: "OTHER",
        amount: 5_000,
        reason: "Spot award",
      }).success,
    ).toBe(true);

    expect(
      createBonusBodySchema.safeParse({
        userId: "user-1",
        type: "OTHER",
        amount: 5_000,
      }).success,
    ).toBe(false);

    expect(
      createBonusBodySchema.safeParse({
        userId: "user-1",
        type: "OTHER",
        amount: 5_000,
        reason: "Award @#$",
      }).success,
    ).toBe(false);
  });
});

describe("validateCreateBonusForm", () => {
  it("accepts a valid bonus form without reason", () => {
    const result = validateCreateBonusForm({
      userId: "user-1",
      amount: "5000.50",
      type: "PERFORMANCE",
      reason: "",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.amount).toBe(5000.5);
      expect(result.data.type).toBe("PERFORMANCE");
      expect(result.data.reason).toBeUndefined();
    }
  });

  it("ignores reason for non-Other types", () => {
    const result = validateCreateBonusForm({
      userId: "user-1",
      amount: "5000.50",
      type: "PERFORMANCE",
      reason: "Exceeded targets",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.reason).toBeUndefined();
    }
  });

  it("requires employee, amount, and Other reason", () => {
    expect(validateCreateBonusForm({ userId: "", amount: "100", type: "SPOT", reason: "" }).ok).toBe(false);
    expect(validateCreateBonusForm({ userId: "u1", amount: "", type: "SPOT", reason: "" }).ok).toBe(false);
    const other = validateCreateBonusForm({ userId: "u1", amount: "100", type: "OTHER", reason: "" });
    expect(other.ok).toBe(false);
    if (!other.ok) expect(other.field).toBe("reason");
  });

  it("rejects invalid amount formats", () => {
    const result = validateCreateBonusForm({
      userId: "user-1",
      amount: "1e5",
      type: "PERFORMANCE",
      reason: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe("amount");
  });
});

describe("bonusOtherReasonSchema", () => {
  it("enforces max length and simple characters", () => {
    expect(bonusOtherReasonSchema.safeParse("a".repeat(BONUS_OTHER_REASON_MAX)).success).toBe(true);
    expect(bonusOtherReasonSchema.safeParse("a".repeat(BONUS_OTHER_REASON_MAX + 1)).success).toBe(false);
    expect(bonusOtherReasonSchema.safeParse("Good work!").success).toBe(false);
  });
});

describe("bonus amount input helpers", () => {
  it("sanitizes invalid pasted values", () => {
    expect(sanitizeBonusAmountInput("12e5")).toBe("125");
    expect(sanitizeBonusAmountInput("--500")).toBe("500");
    expect(sanitizeBonusAmountInput("99.999")).toBe("99.99");
    expect(sanitizeBonusAmountInput("100001")).toBe(String(BONUS_MAX_AMOUNT));
  });

  it("detects over-limit typed values", () => {
    expect(isBonusAmountWithinLimit("100000")).toBe(true);
    expect(isBonusAmountWithinLimit("100001")).toBe(false);
    expect(isBonusAmountWithinLimit("213712313123123")).toBe(false);
    expect(isBonusAmountWithinLimit("")).toBe(true);
  });

  it("returns user-facing amount errors", () => {
    expect(bonusAmountInputError("100001")).toBe(`Amount cannot exceed ₹${BONUS_MAX_AMOUNT.toLocaleString("en-IN")}`);
    expect(bonusAmountInputError("1e5")).toContain("exponential");
    expect(bonusAmountInputError("-10")).toContain("exponential");
    expect(bonusAmountInputError("50000")).toBeNull();
    expect(parseBonusAmount("50000.25")).toBe(50000.25);
  });
});

describe("bonusOtherReasonInputError", () => {
  it("flags missing, long, and special-character reasons", () => {
    expect(bonusOtherReasonInputError("")).toBe("Reason is required when type is Other");
    expect(bonusOtherReasonInputError("a".repeat(BONUS_OTHER_REASON_MAX + 1))).toContain("30 characters");
    expect(bonusOtherReasonInputError("Bonus @ event")).toContain("can only contain");
    expect(bonusOtherReasonInputError("Spot award")).toBeNull();
    expect(sanitizeBonusOtherReasonInput("Award! @test")).toBe("Award test");
  });
});
