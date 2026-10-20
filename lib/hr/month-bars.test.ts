import { describe, expect, it } from "vitest";
import { monthBars } from "./month-bars";

describe("monthBars", () => {
  it("reads both month keys and fills the rest with 0", () => {
    const bars = monthBars([
      { month: "2026-03", count: 2 },
      { month: "Mar", count: 1 },
      { month: "Dec", count: 4 },
      { month: "nope", count: 9 },
    ]);
    expect(bars).toHaveLength(12);
    expect(bars[0]).toEqual({ label: "Jan", value: 0 });
    expect(bars[2]).toEqual({ label: "Mar", value: 3 });
    expect(bars[11]).toEqual({ label: "Dec", value: 4 });
  });
});
