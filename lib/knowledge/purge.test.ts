import { beforeEach, describe, expect, it, vi } from "vitest";

const selectRows: unknown[][] = [];
const inserts: unknown[] = [];
const updates: Array<Record<string, unknown>> = [];
let deletes = 0;
const deletedKeys: string[] = [];
let deleteFileFails = false;

vi.mock("@/lib/db", () => ({
  db: {
    select: () => {
      const chain: Record<string, unknown> = {};
      for (const key of ["from", "where", "limit", "orderBy"]) chain[key] = () => chain;
      chain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve(selectRows.shift() ?? []).then(resolve);
      return chain;
    },
    insert: () => ({
      values: (rows: unknown) => {
        inserts.push(rows);
        return { onConflictDoNothing: async () => undefined };
      },
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => {
        updates.push(values);
        return { where: async () => undefined };
      },
    }),
    delete: () => ({
      where: async () => {
        deletes += 1;
      },
    }),
  },
}));

vi.mock("@/lib/storage", () => ({
  deleteFile: async (key: string) => {
    if (deleteFileFails) throw new Error("R2 said no");
    deletedKeys.push(key);
  },
}));

vi.mock("@/lib/logger", () => ({ logger: { error: () => {}, warn: () => {}, info: () => {} } }));

const { PURGE_STORES, purgeImpact, purgePages } = await import("./purge");

beforeEach(() => {
  selectRows.length = 0;
  inserts.length = 0;
  updates.length = 0;
  deletedKeys.length = 0;
  deletes = 0;
  deleteFileFails = false;
});

describe("purgeImpact", () => {
  it("counts pages and attachments and names the held pages", async () => {
    selectRows.push([{ id: 1, legalHold: false }, { id: 2, legalHold: true }]);
    selectRows.push([{ count: 3 }]);

    await expect(purgeImpact("org-a", [1, 2])).resolves.toEqual({
      pages: 2,
      attachments: 3,
      heldPages: [2],
    });
  });

  it("is empty for no ids, and asks the database nothing", async () => {
    await expect(purgeImpact("org-a", [])).resolves.toEqual({
      pages: 0,
      attachments: 0,
      heldPages: [],
    });
    expect(selectRows).toHaveLength(0);
  });
});

describe("purgePages", () => {
  it("skips a held page entirely rather than purging part of it", async () => {
    selectRows.push([{ id: 1, legalHold: true }]);
    const result = await purgePages("org-a", [1]);
    expect(result).toEqual({ purged: [], held: [1], incomplete: [] });
    expect(deletes).toBe(0);
    expect(inserts).toHaveLength(0);
  });

  it("opens a ledger row per store, deletes the blobs, then the row", async () => {
    selectRows.push([{ id: 1, legalHold: false }]);
    selectRows.push([{ id: 10, fileKey: "kb/org-a/1/a.png" }]);

    const result = await purgePages("org-a", [1]);

    expect(result.purged).toEqual([1]);
    expect((inserts[0] as unknown[]).length).toBe(PURGE_STORES.length);
    expect(deletedKeys).toEqual(["kb/org-a/1/a.png"]);
    expect(deletes).toBe(1);
    // Every store settled.
    expect(updates.filter((u) => u.status === "completed")).toHaveLength(PURGE_STORES.length);
  });

  it("records the failed store and reports the page as incomplete when R2 refuses", async () => {
    selectRows.push([{ id: 1, legalHold: false }]);
    selectRows.push([{ id: 10, fileKey: "kb/org-a/1/a.png" }]);
    deleteFileFails = true;

    const result = await purgePages("org-a", [1]);

    expect(result.incomplete).toEqual([1]);
    expect(result.purged).toEqual([]);
    const failed = updates.find((u) => u.status === "failed");
    expect(failed).toMatchObject({ status: "failed" });
    expect(String(failed?.failedReason)).toContain("R2 said no");
  });
});
