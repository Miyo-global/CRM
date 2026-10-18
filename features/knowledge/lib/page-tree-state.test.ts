import { beforeEach, describe, expect, it, vi } from "vitest";

import { isWithinSubtree, readExpanded, writeExpanded } from "./page-tree-state";

describe("KB-0069: tree expansion state", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    });
  });

  it("round trips the open branches", () => {
    writeExpanded([1, 2, 3]);
    expect(readExpanded()).toEqual([1, 2, 3]);
  });

  it("ignores junk rather than losing the tree", () => {
    localStorage.setItem("kb-tree-expanded", "{not json");
    expect(readExpanded()).toEqual([]);
    localStorage.setItem("kb-tree-expanded", '["a", 2, null]');
    expect(readExpanded()).toEqual([2]);
  });

  it("caps what it stores", () => {
    writeExpanded(Array.from({ length: 500 }, (_, i) => i));
    expect(readExpanded()).toHaveLength(200);
  });

  it("survives storage that throws, as in a private window", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(readExpanded()).toEqual([]);
    expect(() => writeExpanded([1])).not.toThrow();
  });
});

describe("isWithinSubtree", () => {
  // 1 → 2 → 3, and 4 on its own.
  const parentOf = new Map<number, number | null>([
    [1, null],
    [2, 1],
    [3, 2],
    [4, null],
  ]);

  it("blocks dropping a page onto itself", () => {
    expect(isWithinSubtree(1, 1, parentOf)).toBe(true);
  });

  it("blocks dropping a page under its own child or grandchild", () => {
    expect(isWithinSubtree(1, 2, parentOf)).toBe(true);
    expect(isWithinSubtree(1, 3, parentOf)).toBe(true);
  });

  it("allows an unrelated target", () => {
    expect(isWithinSubtree(1, 4, parentOf)).toBe(false);
    expect(isWithinSubtree(3, 4, parentOf)).toBe(false);
  });

  it("allows moving a child up out of its parent", () => {
    expect(isWithinSubtree(3, 1, parentOf)).toBe(false);
  });

  it("does not spin on a cycle in stale client data", () => {
    const cyclic = new Map<number, number | null>([
      [1, 2],
      [2, 1],
    ]);
    expect(isWithinSubtree(9, 1, cyclic)).toBe(false);
  });
});
