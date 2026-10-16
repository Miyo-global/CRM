import { describe, expect, it } from "vitest";
import { computeRank, effectiveRank, RANK_STEP } from "./ticket-rank";

describe("computeRank", () => {
  it("starts an empty column at one step", () => {
    expect(computeRank(null, null)).toEqual({ rank: RANK_STEP });
  });

  it("places before the first card", () => {
    expect(computeRank(null, 1000)).toEqual({ rank: 0 });
  });

  it("places after the last card", () => {
    expect(computeRank(3000, null)).toEqual({ rank: 4000 });
  });

  it("uses the midpoint between neighbours", () => {
    expect(computeRank(1000, 2000)).toEqual({ rank: 1500 });
  });

  it("asks for a rebalance when the gap is exhausted", () => {
    expect(computeRank(1000, 1000)).toEqual({ rebalance: true });
    expect(computeRank(1000, 1000.000001)).toEqual({ rebalance: true });
  });

  it("asks for a rebalance when neighbours are reversed", () => {
    expect(computeRank(2000, 1000)).toEqual({ rebalance: true });
  });
});

describe("effectiveRank", () => {
  it("prefers the stored rank", () => {
    expect(effectiveRank("1500.5", 3)).toBe(1500.5);
  });

  it("falls back to the legacy order", () => {
    expect(effectiveRank(null, 3)).toBe(3000);
    expect(effectiveRank(null, null)).toBe(0);
  });
});
