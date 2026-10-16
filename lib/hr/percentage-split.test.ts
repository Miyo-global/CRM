import { describe, expect, it } from "vitest";
import { percentageSplit } from "./percentage-split";

describe("percentageSplit", () => {
  it("adds up to 100 where naive rounding does not", () => {
    const split = percentageSplit([{ count: 1 }, { count: 1 }, { count: 1 }]);
    expect(split.map((s) => s.pct).reduce((a, b) => a + b, 0)).toBe(100);
    expect(split.map((s) => s.pct).sort()).toEqual([33, 33, 34]);
  });

  it("gives every bucket 0 when there is nothing to split", () => {
    expect(percentageSplit([{ count: 0 }, { count: 0 }])).toEqual([
      { count: 0, pct: 0 },
      { count: 0, pct: 0 },
    ]);
  });

  it("keeps the other fields on each bucket", () => {
    expect(percentageSplit([{ label: "MALE", count: 3 }, { label: "FEMALE", count: 1 }])).toEqual([
      { label: "MALE", count: 3, pct: 75 },
      { label: "FEMALE", count: 1, pct: 25 },
    ]);
  });
});
