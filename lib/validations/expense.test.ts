import { describe, it, expect } from "vitest";
import {
  validateExpenseExportDateRange,
  formatExpenseSubmitterLabel,
  createExpenseBodySchema,
} from "./expense";

describe("validateExpenseExportDateRange", () => {
  const today = "2026-06-13";

  it("rejects from after to", () => {
    expect(validateExpenseExportDateRange("2026-06-20", "2026-06-01", today)).toMatch(/From date/);
  });

  it("rejects future from date", () => {
    expect(validateExpenseExportDateRange("2026-07-01", "2026-07-31", today)).toMatch(/From date/);
  });

  it("rejects future to date", () => {
    expect(validateExpenseExportDateRange("2026-01-01", "2026-07-01", today)).toMatch(/To date/);
  });

  it("accepts a valid past range", () => {
    expect(validateExpenseExportDateRange("2026-01-01", "2026-06-01", today)).toBeNull();
  });
});

describe("formatExpenseSubmitterLabel", () => {
  it('returns "Created by Me" for the current user', () => {
    expect(
      formatExpenseSubmitterLabel(
        { id: "u1", email: "ceo@example.com" },
        "u1",
      ),
    ).toBe("Created by Me");
  });

  it('returns "Created by Me" when user payload omits id but submitter id matches', () => {
    expect(
      formatExpenseSubmitterLabel(
        { email: "ceo@example.com" },
        "u1",
        "u1",
      ),
    ).toBe("Created by Me");
  });

  it("prefers first/last name, then name, then email", () => {
    expect(
      formatExpenseSubmitterLabel({ id: "u2", firstName: "Tarun", lastName: "C" }),
    ).toBe("Tarun C");
    expect(formatExpenseSubmitterLabel({ id: "u3", name: "Tarun Ch" })).toBe("Tarun Ch");
    expect(formatExpenseSubmitterLabel({ id: "u4", email: "a@b.com" })).toBe("a@b.com");
  });
});

describe("createExpenseBodySchema", () => {
  it("rejects amounts above the cap", () => {
    const r = createExpenseBodySchema.safeParse({
      category: "Travel",
      amount: 10_000_001,
      expenseDate: "2026-06-01",
    });
    expect(r.success).toBe(false);
  });
});
