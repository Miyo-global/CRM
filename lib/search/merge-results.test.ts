import { describe, expect, it } from "vitest";
import { mergeSearchResults, type SearchResult } from "./merge-results";

const hit = (type: SearchResult["type"], id: number): SearchResult => ({
  id, type, title: `${type} ${id}`, subtitle: "", href: "/",
});

describe("mergeSearchResults", () => {
  it("keeps the results of sources that succeeded when another fails", () => {
    const merged = mergeSearchResults(
      ["projects", "leaves", "holidays"],
      [
        { status: "fulfilled", value: [hit("project", 1)] },
        { status: "rejected", reason: new Error("column does not exist") },
        { status: "fulfilled", value: [hit("holiday", 2), hit("holiday", 3)] },
      ],
    );
    expect(merged.results.map((r) => r.id)).toEqual([1, 2, 3]);
    expect(merged.total).toBe(3);
    expect(merged.failedSources).toEqual(["leaves"]);
  });

  it("returns an empty, non-failing result when every source finds nothing", () => {
    const merged = mergeSearchResults(["a"], [{ status: "fulfilled", value: [] }]);
    expect(merged).toEqual({ results: [], total: 0, failedSources: [] });
  });
});
