import { describe, expect, it } from "vitest";
import { expenseKpiWindows } from "./expense-kpi";

describe("expenseKpiWindows", () => {
  it("bounds today to the IST calendar day", () => {
    const w = expenseKpiWindows("2026-10-28");
    expect(w.dayStart).toBe("2026-10-27T18:30:00.000Z");
    expect(w.dayEnd).toBe("2026-10-28T18:30:00.000Z");
    expect(w.monthStart).toBe("2026-10-01");
    expect(w.nextMonthStart).toBe("2026-11-01");
    expect(w.yearStart).toBe("2025-12-31T18:30:00.000Z");
    expect(w.last30Start).toBe("2026-09-28T18:30:00.000Z");
  });

  it("rolls the month over at December", () => {
    const w = expenseKpiWindows("2026-12-31");
    expect(w.monthStart).toBe("2026-12-01");
    expect(w.nextMonthStart).toBe("2027-01-01");
    expect(w.dayEnd).toBe("2026-12-31T18:30:00.000Z");
  });
});
