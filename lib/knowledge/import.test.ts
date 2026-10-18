import { beforeEach, describe, expect, it, vi } from "vitest";

const selectRows: unknown[][] = [];
const inserts: Array<Record<string, unknown>> = [];
const updates: Array<Record<string, unknown>> = [];
let insertThrows = false;

vi.mock("@/lib/db", () => ({
  db: {
    select: () => {
      const chain: Record<string, unknown> = {};
      for (const key of ["from", "where", "limit"]) chain[key] = () => chain;
      chain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve(selectRows.shift() ?? []).then(resolve);
      return chain;
    },
    insert: () => ({
      values: async (rows: Record<string, unknown>) => {
        if (insertThrows) throw new Error("insert refused");
        inserts.push(rows);
      },
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => {
        updates.push(values);
        return { where: async () => undefined };
      },
    }),
  },
}));

const { importRequestSchema, planImport, runImport, IMPORT_MAX_ITEMS } = await import("./import");

beforeEach(() => {
  selectRows.length = 0;
  inserts.length = 0;
  updates.length = 0;
  insertThrows = false;
});

const request = (overrides: Record<string, unknown> = {}) =>
  importRequestSchema.parse({
    sourceType: "markdown",
    items: [{ title: "Leave policy", contentText: "# Leave policy\n\nAsk HR." }],
    ...overrides,
  });

describe("importRequestSchema", () => {
  it("requires externalId and externalSource together", () => {
    expect(() =>
      importRequestSchema.parse({
        sourceType: "markdown",
        items: [{ title: "T", contentText: "x", externalId: "1" }],
      }),
    ).toThrow();
  });

  it("caps the batch at 100 items", () => {
    const items = Array.from({ length: IMPORT_MAX_ITEMS + 1 }, () => ({
      title: "T",
      contentText: "x",
    }));
    expect(() => importRequestSchema.parse({ sourceType: "markdown", items })).toThrow();
  });

  it("defaults the visibility and the duplicate policy", () => {
    expect(request()).toMatchObject({ visibility: "org", duplicatePolicy: "skip" });
  });
});

describe("planImport", () => {
  it("counts a new page", async () => {
    const plan = await planImport("org-a", request());
    expect(plan).toMatchObject({ total: 1, new: 1, duplicate: 0, invalid: 0 });
  });

  it("marks an empty body invalid rather than importing a blank page", async () => {
    const plan = await planImport(
      "org-a",
      request({ items: [{ title: "T", contentText: "   " }] }),
    );
    expect(plan).toMatchObject({ invalid: 1 });
  });

  it("recognises a page already imported from the same source", async () => {
    selectRows.push([{ id: 9, externalId: "doc-1", externalSource: "notion" }]);
    const plan = await planImport(
      "org-a",
      request({
        items: [{ title: "T", contentText: "x", externalId: "doc-1", externalSource: "notion" }],
      }),
    );
    expect(plan).toMatchObject({ duplicate: 1 });
    expect(plan.items[0].existingPageId).toBe(9);
  });
});

describe("runImport", () => {
  it("creates a page from markdown with derived text", async () => {
    const outcome = await runImport("org-a", "u1", request());
    expect(outcome).toMatchObject({ created: 1, updated: 0, skipped: 0, failed: 0 });
    expect(inserts[0]).toMatchObject({
      title: "Leave policy",
      status: "draft",
      createdById: "u1",
      contentText: "Leave policy\nAsk HR.",
    });
  });

  it("skips a duplicate under the skip policy and updates it under update", async () => {
    const items = [
      { title: "T", contentText: "body", externalId: "doc-1", externalSource: "notion" },
    ];

    selectRows.push([{ id: 9, externalId: "doc-1", externalSource: "notion" }]);
    const skipped = await runImport("org-a", "u1", request({ items, duplicatePolicy: "skip" }));
    expect(skipped).toMatchObject({ skipped: 1, created: 0, updated: 0 });
    expect(inserts).toHaveLength(0);

    selectRows.push([{ id: 9, externalId: "doc-1", externalSource: "notion" }]);
    const updated = await runImport("org-a", "u1", request({ items, duplicatePolicy: "update" }));
    expect(updated).toMatchObject({ updated: 1 });
    expect(updates[0]).toMatchObject({ title: "T", contentText: "body" });
  });

  it("converts HTML when that is the source type", async () => {
    await runImport(
      "org-a",
      "u1",
      request({ sourceType: "html", items: [{ title: "T", contentText: "<h1>Hi</h1>" }] }),
    );
    expect(inserts[0]).toMatchObject({ contentText: "Hi" });
  });

  it("records a failure per item and keeps going", async () => {
    insertThrows = true;
    const outcome = await runImport("org-a", "u1", request());
    expect(outcome.failed).toBe(1);
    expect(outcome.errors[0]).toMatchObject({ title: "Leave policy" });
  });
});
