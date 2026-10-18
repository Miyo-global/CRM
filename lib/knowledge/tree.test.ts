import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.fn();
const select = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    execute: (...a: unknown[]) => execute(...a),
    select: () => ({ from: () => ({ where: (...a: unknown[]) => select(...a) }) }),
  },
}));

const { cycleFromAncestry, getAncestors, getSubtreeIds, nextSortOrder, wouldCreateCycle } =
  await import("./tree");

beforeEach(() => {
  execute.mockReset();
  select.mockReset();
});

describe("cycleFromAncestry", () => {
  it("is a cycle when the page would be its own parent", () => {
    expect(cycleFromAncestry(5, 5, [])).toBe(true);
  });

  it("is a cycle when the page sits above the would-be parent", () => {
    // Moving 5 under 9, where 9's ancestors are 7 then 5.
    expect(cycleFromAncestry(5, 9, [7, 5])).toBe(true);
  });

  it("is not a cycle for an unrelated parent or for the root", () => {
    expect(cycleFromAncestry(5, 9, [7, 3])).toBe(false);
    expect(cycleFromAncestry(5, null, [])).toBe(false);
  });
});

describe("wouldCreateCycle", () => {
  it("answers without a query when the parent is the page itself", async () => {
    await expect(wouldCreateCycle("org-a", 5, 5)).resolves.toBe(true);
    expect(execute).not.toHaveBeenCalled();
  });

  it("refuses a move under the page's own child", async () => {
    execute.mockResolvedValueOnce([
      { id: 7, title: "mid", depth: 1 },
      { id: 5, title: "top", depth: 2 },
    ]);
    await expect(wouldCreateCycle("org-a", 5, 9)).resolves.toBe(true);
  });

  it("allows a move elsewhere", async () => {
    execute.mockResolvedValueOnce([{ id: 2, title: "other", depth: 1 }]);
    await expect(wouldCreateCycle("org-a", 5, 9)).resolves.toBe(false);
  });
});

describe("getAncestors", () => {
  it("returns breadcrumbs nearest-parent first", async () => {
    execute.mockResolvedValueOnce([
      { id: 7, title: "Handbook", depth: 1 },
      { id: 3, title: "Company", depth: 2 },
    ]);
    await expect(getAncestors("org-a", 11)).resolves.toEqual([
      { id: 7, title: "Handbook" },
      { id: 3, title: "Company" },
    ]);
  });

  it("reads the rows shape the driver returns, and skips a bad id", async () => {
    execute.mockResolvedValueOnce({ rows: [{ id: 7, title: "Handbook", depth: 1 }] });
    await expect(getAncestors("org-a", 11)).resolves.toHaveLength(1);
    await expect(getAncestors("org-a", 0)).resolves.toEqual([]);
    expect(execute).toHaveBeenCalledTimes(1);
  });
});

describe("getSubtreeIds", () => {
  it("includes the page itself", async () => {
    execute.mockResolvedValueOnce([{ id: 5 }, { id: 6 }, { id: 7 }]);
    await expect(getSubtreeIds("org-a", 5)).resolves.toEqual([5, 6, 7]);
  });
});

describe("nextSortOrder", () => {
  it("starts at 0 on an empty level", async () => {
    select.mockResolvedValueOnce([{ max: null }]);
    await expect(nextSortOrder("org-a", null)).resolves.toBe(0);
  });

  it("appends after the last sibling", async () => {
    select.mockResolvedValueOnce([{ max: 4 }]);
    await expect(nextSortOrder("org-a", 9)).resolves.toBe(5);
  });
});
