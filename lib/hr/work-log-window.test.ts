import { describe, expect, it } from "vitest";
import { normalizeWorkLogFilters, resolveWorkLogWindow } from "./work-log-window";

describe("resolveWorkLogWindow", () => {
  it("defaults to the quarter window", () => {
    expect(resolveWorkLogWindow({ year: 2026, quarter: 1 })).toEqual({
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    });
    expect(resolveWorkLogWindow({ year: 2026, quarter: 2 })).toEqual({
      startDate: "2026-04-01",
      endDate: "2026-06-30",
    });
    expect(resolveWorkLogWindow({ year: 2026, quarter: 4 })).toEqual({
      startDate: "2026-10-01",
      endDate: "2026-12-31",
    });
  });

  it("month overrides the quarter", () => {
    expect(resolveWorkLogWindow({ year: 2026, quarter: 1, month: 5 })).toEqual({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });
    expect(resolveWorkLogWindow({ year: 2024, quarter: 1, month: 1 })).toEqual({
      startDate: "2024-02-01",
      endDate: "2024-02-29",
    });
  });

  it("an explicit date range overrides month and quarter (can span quarters/years)", () => {
    expect(
      resolveWorkLogWindow({ year: 2026, quarter: 1, month: 5, dateFrom: "2026-02-15", dateTo: "2026-08-20" })
    ).toEqual({ startDate: "2026-02-15", endDate: "2026-08-20" });
  });

  it("fills in the open end of a one-sided range with quarter or month bounds", () => {
    expect(resolveWorkLogWindow({ year: 2026, quarter: 1, dateFrom: "2026-02-15" })).toEqual({
      startDate: "2026-02-15",
      endDate: "2026-03-31",
    });
    expect(resolveWorkLogWindow({ year: 2026, quarter: 1, dateTo: "2026-02-15" })).toEqual({
      startDate: "2026-01-01",
      endDate: "2026-02-15",
    });
    expect(resolveWorkLogWindow({ year: 2026, quarter: 1, month: 5, dateFrom: "2026-06-10" })).toEqual({
      startDate: "2026-06-10",
      endDate: "2026-06-30",
    });
  });

  it("ignores incomplete custom ranges", () => {
    expect(resolveWorkLogWindow({ year: 2026, quarter: 2, dateFrom: "2026-04-01" })).toEqual({
      startDate: "2026-04-01",
      endDate: "2026-06-30",
    });
  });

  it("normalizes a reversed range", () => {
    expect(resolveWorkLogWindow({ year: 2026, quarter: 1, dateFrom: "2026-08-01", dateTo: "2026-02-01" })).toEqual({
      startDate: "2026-02-01",
      endDate: "2026-08-01",
    });
  });
});

describe("normalizeWorkLogFilters", () => {
  it("normalizes redundant quarter ranges out of filter state", () => {
    expect(
      normalizeWorkLogFilters({
        year: 2026,
        quarter: 2,
        dateFrom: "2026-04-01",
        dateTo: "2026-06-30",
      }),
    ).toEqual({ year: 2026, quarter: 2 });
  });

  it("drops incomplete custom ranges", () => {
    expect(
      normalizeWorkLogFilters({
        year: 2026,
        quarter: 2,
        dateFrom: "2026-04-01",
      }),
    ).toEqual({ year: 2026, quarter: 2, dateFrom: undefined, dateTo: undefined });
  });
});
