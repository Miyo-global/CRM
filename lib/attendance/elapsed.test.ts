import { describe, expect, it } from "vitest";
import { elapsedHms } from "./elapsed";

describe("elapsedHms", () => {
  it("is 00:00:00, not -1:-1:-1, when the check-in is a moment in the future (FR1-029)", () => {
    expect(elapsedHms("2026-10-26T06:00:01.500Z", new Date("2026-10-26T06:00:00Z"))).toEqual({
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it("counts normally otherwise", () => {
    expect(elapsedHms("2026-10-26T06:00:00Z", new Date("2026-10-26T08:05:09Z"))).toEqual({
      hours: 2,
      minutes: 5,
      seconds: 9,
    });
  });
});
