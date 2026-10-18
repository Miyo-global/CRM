import { beforeEach, describe, expect, it, vi } from "vitest";

const rows = vi.fn();
const updates: Array<Record<string, unknown>> = [];

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (...a: unknown[]) => {
          const result = rows(...a);
          return Object.assign(Promise.resolve(result), {
            limit: async () => result,
          });
        },
      }),
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => {
        updates.push(values);
        return { where: async () => undefined };
      },
    }),
  },
}));

vi.mock("@/lib/logger", () => ({ logger: { info: () => {}, warn: () => {}, error: () => {} } }));

const { backfillContentText, backfillContentTextBatch, countPagesMissingContentText } =
  await import("./backfill-content-text");

beforeEach(() => {
  rows.mockReset();
  updates.length = 0;
});

describe("countPagesMissingContentText", () => {
  it("reads the count", async () => {
    rows.mockReturnValueOnce([{ count: 12 }]);
    await expect(countPagesMissingContentText()).resolves.toBe(12);
  });

  it("is zero when the query comes back empty", async () => {
    rows.mockReturnValueOnce([]);
    await expect(countPagesMissingContentText()).resolves.toBe(0);
  });
});

describe("backfillContentTextBatch", () => {
  it("derives text and excerpt from a legacy Tiptap doc", async () => {
    rows.mockReturnValueOnce([
      {
        id: 1,
        orgId: "org-a",
        content: {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Sprint" }] },
            { type: "paragraph", content: [{ type: "text", text: "Ship Friday." }] },
          ],
        },
      },
    ]);

    const result = await backfillContentTextBatch(50);

    expect(result).toEqual({ scanned: 1, updated: 1, more: false });
    expect(updates[0]).toEqual({ contentText: "Sprint\nShip Friday.", excerpt: "Sprint Ship Friday." });
  });

  it("writes only the derived columns, never the content", async () => {
    rows.mockReturnValueOnce([{ id: 1, orgId: "org-a", content: "plain text" }]);
    await backfillContentTextBatch(50);
    expect(Object.keys(updates[0])).toEqual(["contentText", "excerpt"]);
  });

  it("reports more work when the batch came back full", async () => {
    rows.mockReturnValueOnce([
      { id: 1, orgId: "org-a", content: "a" },
      { id: 2, orgId: "org-a", content: "b" },
    ]);
    await expect(backfillContentTextBatch(2)).resolves.toMatchObject({ more: true });
  });
});

describe("backfillContentText", () => {
  it("loops until a batch is short", async () => {
    rows
      .mockReturnValueOnce([{ id: 1, orgId: "o", content: "a" }, { id: 2, orgId: "o", content: "b" }])
      .mockReturnValueOnce([{ id: 3, orgId: "o", content: "c" }]);

    await expect(backfillContentText({ batchSize: 2, delayMs: 0 })).resolves.toEqual({
      scanned: 3,
      updated: 3,
      batches: 2,
    });
  });

  it("stops at maxBatches rather than looping forever", async () => {
    rows.mockReturnValue([{ id: 1, orgId: "o", content: "a" }]);
    const result = await backfillContentText({ batchSize: 1, delayMs: 0, maxBatches: 3 });
    expect(result.batches).toBe(3);
  });
});
