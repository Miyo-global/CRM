import { describe, expect, it } from "vitest";
import { celebrationKey, celebrationsOn, fallsOnDate } from "../celebrations";

const member = (over: Partial<Parameters<typeof celebrationsOn>[0][number]> = {}) => ({
  id: "u1",
  name: "Ravi",
  email: "ravi@example.com",
  ...over,
});

describe("celebrations today, in IST (A34)", () => {
  it("matches a birthday on the same month and day", () => {
    expect(fallsOnDate("1994-10-15", "2026-10-15")).toBe(true);
    expect(fallsOnDate("1994-10-16", "2026-10-15")).toBe(false);
  });

  it("greets a 29 February birthday on 28 February in a non-leap year", () => {
    // 2026 has no 29 February, 2028 does.
    expect(fallsOnDate("2000-02-29", "2026-02-28")).toBe(true);
    expect(fallsOnDate("2000-02-29", "2028-02-29")).toBe(true);
    expect(fallsOnDate("2000-02-29", "2028-02-28")).toBe(false);
    expect(fallsOnDate("2000-02-28", "2026-02-28")).toBe(true);
  });

  it("lists birthdays and anniversaries with completed years", () => {
    const result = celebrationsOn(
      [
        member({ dateOfBirth: "1994-10-15" }),
        member({ id: "u2", name: "Asha", joiningDate: "2023-10-15" }),
      ],
      "2026-10-15",
    );
    expect(result.birthdays.map((c) => c.userId)).toEqual(["u1"]);
    expect(result.anniversaries).toEqual([
      {
        userId: "u2",
        name: "Asha",
        email: "ravi@example.com",
        type: "anniversary",
        yearsCompleted: 3,
        // MIYO-0165: the anniversary mail prints the start date.
        joiningDate: "2023-10-15",
      },
    ]);
  });

  it("does not treat the joining day itself as an anniversary", () => {
    const result = celebrationsOn([member({ joiningDate: "2026-10-15" })], "2026-10-15");
    expect(result.anniversaries).toEqual([]);
  });

  it("ignores members with no dates", () => {
    expect(celebrationsOn([member()], "2026-10-15")).toEqual({
      birthdays: [],
      anniversaries: [],
    });
  });

  it("keys one greeting per person per type per year", () => {
    expect(celebrationKey("birthday", "u1", 2026)).toBe("birthday:u1:2026");
  });
});
