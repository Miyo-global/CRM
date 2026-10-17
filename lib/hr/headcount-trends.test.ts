import { describe, it, expect } from "vitest";
import { trendMonths, cumulativeHeadcount } from "./headcount-trends";

describe("headcount trends", () => {
  it("builds 12 months ending on the last calendar day", () => {
    const months = trendMonths(new Date(2025, 2, 15)); // 15 Mar 2025
    expect(months).toHaveLength(12);
    expect(months[0].end).toBe("2024-04-30");
    expect(months[11].end).toBe("2025-03-31");
    expect(months[11].label).toBe("Mar 25");
  });

  it("accumulates joiners into a running headcount", () => {
    const months = trendMonths(new Date(2025, 2, 15));
    const trends = cumulativeHeadcount(months, [
      { joiningDate: "2020-01-01", count: 5 }, // before the window
      { joiningDate: "2024-04-30", count: 2 }, // on a month boundary
      { joiningDate: "2025-03-31", count: "1" }, // count comes back as text
    ]);
    expect(trends[0]).toEqual({ month: "Apr 24", count: 7 });
    expect(trends[10].count).toBe(7);
    expect(trends[11]).toEqual({ month: "Mar 25", count: 8 });
  });
});
