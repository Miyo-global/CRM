import { describe, it, expect } from "vitest";

import { hasSearchTerms, ilikePattern } from "./candidate-search";

describe("hasSearchTerms", () => {
  it("treats blank and spaces as no search", () => {
    expect(hasSearchTerms("")).toBe(false);
    expect(hasSearchTerms("   ")).toBe(false);
    expect(hasSearchTerms("react")).toBe(true);
  });
});

describe("ilikePattern", () => {
  it("escapes the wildcards so they match themselves", () => {
    expect(ilikePattern("100%")).toBe("%100\\%%");
    expect(ilikePattern("a_b")).toBe("%a\\_b%");
  });

  it("wraps an ordinary word", () => {
    expect(ilikePattern(" react ")).toBe("%react%");
  });
});
