import { describe, it, expect } from "vitest";
import { computeStrictAttendance } from "./payroll-calculations";

describe("computeStrictAttendance", () => {
  it("counts any check-in as a full present day", () => {
    const r = computeStrictAttendance({
      month: "2026-06",
      workHoursByDate: new Map([
        ["2026-06-01", 8],
        ["2026-06-02", 6],
        ["2026-06-06", 4],
        ["2026-06-13", 2],
      ]),
      holidayDates: new Set(["2026-06-04"]),
      leaveByDate: new Map(),
      evaluateThroughDate: "2026-06-30",
    });

    expect(r.calDays).toBe(30);
    expect(r.weekendDays).toBe(4);
    expect(r.holidayDays).toBe(1);
    expect(r.workingDays).toBe(25);
    expect(r.fullPresentDays).toBe(4);
    expect(r.paidLeaveDays).toBe(1);
    expect(r.lopDays).toBe(20);
    expect(r.fullPresentDays + r.paidLeaveDays + r.lopDays).toBe(r.workingDays);
  });

  it("weekday: any logged hours count as full present", () => {
    const full = computeStrictAttendance({
      month: "2026-06",
      workHoursByDate: new Map([["2026-06-01", 8]]),
      holidayDates: new Set(),
      leaveByDate: new Map(),
      evaluateThroughDate: "2026-06-01",
    });
    expect(full.fullPresentDays).toBe(1);

    const short = computeStrictAttendance({
      month: "2026-06",
      workHoursByDate: new Map([["2026-06-01", 7.9]]),
      holidayDates: new Set(),
      leaveByDate: new Map(),
      evaluateThroughDate: "2026-06-01",
    });
    expect(short.fullPresentDays).toBe(1);
    expect(short.lopDays).toBe(0);
  });

  it("Saturday: any check-in counts as full present", () => {
    const weekdays = new Map([
      ["2026-06-01", 8],
      ["2026-06-02", 8],
      ["2026-06-03", 8],
      ["2026-06-04", 8],
      ["2026-06-05", 8],
    ]);
    const ok = computeStrictAttendance({
      month: "2026-06",
      workHoursByDate: new Map([...weekdays, ["2026-06-06", 3]]),
      holidayDates: new Set(),
      leaveByDate: new Map(),
      evaluateThroughDate: "2026-06-06",
    });
    expect(ok.fullPresentDays).toBe(6);

    const short = computeStrictAttendance({
      month: "2026-06",
      workHoursByDate: new Map([...weekdays, ["2026-06-06", 2.9]]),
      holidayDates: new Set(),
      leaveByDate: new Map(),
      evaluateThroughDate: "2026-06-06",
    });
    expect(short.fullPresentDays).toBe(6);
    expect(short.lopDays).toBe(0);
    expect(short.paidLeaveDays).toBe(0);
  });

  it("first absent day per month is auto casual; further absences are LOP", () => {
    const r = computeStrictAttendance({
      month: "2026-06",
      workHoursByDate: new Map(),
      holidayDates: new Set(),
      leaveByDate: new Map(),
      evaluateThroughDate: "2026-06-03",
    });
    expect(r.paidLeaveDays).toBe(1);
    expect(r.lopDays).toBe(2);
  });

  it("leave approval status does not affect paid casual — first absence wins", () => {
    const r = computeStrictAttendance({
      month: "2026-06",
      workHoursByDate: new Map([["2026-06-01", 8]]),
      holidayDates: new Set(),
      leaveByDate: new Map([
        ["2026-06-02", "FULL"],
        ["2026-06-03", "FULL"],
      ]),
      evaluateThroughDate: "2026-06-03",
    });
    expect(r.fullPresentDays).toBe(1);
    expect(r.paidLeaveDays).toBe(1);
    expect(r.lopDays).toBe(1);
  });

  it("Sunday is a paid weekly off and never LOP", () => {
    const r = computeStrictAttendance({
      month: "2026-06",
      workHoursByDate: new Map(),
      holidayDates: new Set(),
      leaveByDate: new Map(),
      evaluateThroughDate: "2026-06-07",
    });

    expect(r.weekendDays).toBe(1);
    expect(r.workingDays).toBe(6);
    expect(r.paidLeaveDays).toBe(1);
    expect(r.lopDays).toBe(5);
  });
});
