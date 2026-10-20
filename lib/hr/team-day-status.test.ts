import { describe, expect, it } from "vitest";
import { teamDayStatuses } from "./team-day-status";

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
