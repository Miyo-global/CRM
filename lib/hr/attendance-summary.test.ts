import { describe, expect, it } from "vitest";
import {
  isPresentAttendanceStatus,
  monthRangeYmd,
  quarterRangeYmd,
  summarizeAttendanceLogs,
} from "./attendance-summary";

describe("isPresentAttendanceStatus", () => {
  it("treats common worked statuses as present", () => {
    expect(isPresentAttendanceStatus("PRESENT")).toBe(true);
    expect(isPresentAttendanceStatus("checked_out")).toBe(true);
    expect(isPresentAttendanceStatus("LATE")).toBe(true);
    expect(isPresentAttendanceStatus("ABSENT")).toBe(false);
  });
});

describe("summarizeAttendanceLogs", () => {
  it("computes weekday attendance rate and averages", () => {
    const { start, end } = monthRangeYmd(2026, 0);
    const today = new Date(2026, 0, 10);
    const logs = [
      { date: "2026-01-05", status: "PRESENT", workHours: "8" },
      { date: "2026-01-06", status: "PRESENT", workHours: "8" },
      { date: "2026-01-07", status: "ABSENT", workHours: null },
    ];
    const s = summarizeAttendanceLogs(logs, start, end, today, "month", "January 2026");
    expect(s.weekdaysElapsed).toBeGreaterThan(0);
    expect(s.presentWeekdays).toBe(2);
    expect(s.attendanceRatePct).toBeLessThanOrEqual(100);
    expect(s.totalWorkHours).toBe(16);
    expect(s.avgHoursPerPresentDay).toBe(8);
  });

  it("excludes org holidays from elapsed and period weekday counts", () => {
    const { start, end } = monthRangeYmd(2026, 0);
    const today = new Date(2026, 0, 10);
    const logs = [
      { date: "2026-01-05", status: "PRESENT", workHours: "8" },
      { date: "2026-01-06", status: "PRESENT", workHours: "8" },
    ];
    const holidays = new Set(["2026-01-07", "2026-01-08", "2026-01-09"]);
    const s = summarizeAttendanceLogs(
      logs,
      start,
      end,
      today,
      "month",
      "January 2026",
      holidays,
    );
    const baseline = summarizeAttendanceLogs(logs, start, end, today, "month", "January 2026");
    expect(s.presentWeekdays).toBe(2);
    expect(s.weekdaysElapsed).toBe(baseline.weekdaysElapsed - holidays.size);
    expect(s.weekdaysInPeriod).toBe(baseline.weekdaysInPeriod - holidays.size);
    expect(s.attendanceRatePct).toBeGreaterThan(baseline.attendanceRatePct);
  });
});

describe("quarterRangeYmd", () => {
  it("returns Q1 boundaries", () => {
    const r = quarterRangeYmd(2026, 1);
    expect(r.start).toBe("2026-01-01");
    expect(r.end).toBe("2026-03-31");
  });
});
