import { describe, expect, it } from "vitest";
import { teamDayStatuses, isWeekendDate } from "./team-day-status";

describe("teamDayStatuses (QA-BUG-09)", () => {
  it("counts each person once and ranks leave, then check-in", () => {
    const members = [{ userId: "a" }, { userId: "b" }, { userId: "a" }, { userId: "c" }];
    const rows = teamDayStatuses(members, new Set(["a", "b"]), new Set(["b"]));
    expect(rows.map((r) => [r.userId, r.status])).toEqual([
      ["a", "present"],
      ["b", "leave"],
      ["c", "absent"],
    ]);
  });
});

describe("weekends and holidays are off, not absent (R3-EMP-10)", () => {
  it("marks no-shows off on a non-working day", () => {
    const rows = teamDayStatuses([{ userId: "a" }, { userId: "b" }], new Set(["a"]), new Set(), false);
    expect(rows.map((r) => r.status)).toEqual(["present", "off"]);
  });

  it("knows Saturday and Sunday from a date string", () => {
    expect(isWeekendDate("2026-10-24")).toBe(true); // Saturday
    expect(isWeekendDate("2026-10-25")).toBe(true); // Sunday
    expect(isWeekendDate("2026-10-23")).toBe(false); // Friday
  });
});
