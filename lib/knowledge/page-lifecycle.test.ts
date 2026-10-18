import { beforeEach, describe, expect, it, vi } from "vitest";

const selectRows: unknown[][] = [];
const findFirst: Record<string, unknown> = {};
const inserts: Array<Record<string, unknown>> = [];
const updates: Array<Record<string, unknown>> = [];
let insertIds: number[] = [];

vi.mock("@/lib/db", () => ({
  db: {
    query: new Proxy(
      {},
      {
        get: (_t, table: string) => ({ findFirst: async () => findFirst[table] }),
      },
    ),
    select: () => {
      const chain: Record<string, unknown> = {};
      for (const key of ["from", "where", "orderBy", "limit"]) chain[key] = () => chain;
      chain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve(selectRows.shift() ?? []).then(resolve);
      return chain;
    },
    insert: () => ({
      values: (rows: Record<string, unknown>) => {
        inserts.push(rows);
        const id = insertIds.shift() ?? inserts.length + 100;
        return { returning: async () => [{ id }] };
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

const subtree = vi.fn();
vi.mock("./tree", () => ({
  getSubtreeIds: (...a: unknown[]) => subtree(...a),
  nextSortOrder: async () => 7,
}));

const { duplicatePage, restoreSubtree, trashSubtree } = await import("./page-lifecycle");

beforeEach(() => {
  selectRows.length = 0;
  inserts.length = 0;
  updates.length = 0;
  insertIds = [];
  for (const key of Object.keys(findFirst)) delete findFirst[key];
  subtree.mockReset();
});

const page = (id: number, parentPageId: number | null) => ({
  id,
  parentPageId,
  spaceId: 3,
  projectId: null,
  title: `Page ${id}`,
  icon: null,
  coverImage: null,
  content: [{ type: "p", children: [{ text: `body ${id}` }] }],
  contentType: "note",
  visibility: "org",
  sortOrder: 1,
});

describe("duplicatePage", () => {
  it("copies one page as a draft titled Copy of …", async () => {
    subtree.mockResolvedValue([5]);
    selectRows.push([page(5, null)]);
    insertIds = [50];

    await expect(duplicatePage("org-a", 5, "u1", false)).resolves.toEqual({
      rootId: 50,
      created: 1,
    });
    expect(inserts[0]).toMatchObject({
      title: "Copy of Page 5",
      status: "draft",
      createdById: "u1",
      ownerUserId: "u1",
      contentText: "body 5",
    });
  });

  it("copies three levels and re-parents each copy to its copied parent", async () => {
    subtree.mockResolvedValue([5, 6, 7]);
    selectRows.push([page(5, null), page(6, 5), page(7, 6)]);
    insertIds = [50, 60, 70];

    const result = await duplicatePage("org-a", 5, "u1", true);

    expect(result).toEqual({ rootId: 50, created: 3 });
    expect(inserts[1]).toMatchObject({ parentPageId: 50, title: "Page 6" });
    expect(inserts[2]).toMatchObject({ parentPageId: 60, title: "Page 7" });
  });

  it("is null when the page is gone", async () => {
    subtree.mockResolvedValue([5]);
    selectRows.push([]);
    await expect(duplicatePage("org-a", 5, "u1", false)).resolves.toBeNull();
  });
});

describe("trashSubtree", () => {
  it("soft-deletes the subtree and revokes the share links", async () => {
    subtree.mockResolvedValue([5, 6]);
    await expect(trashSubtree("org-a", 5, "u1")).resolves.toEqual([5, 6]);
    expect(updates[0]).toMatchObject({ deletedById: "u1", publicToken: null, publicTokenHash: null });
  });

  it("does nothing for an unknown page", async () => {
    subtree.mockResolvedValue([]);
    await expect(trashSubtree("org-a", 5, "u1")).resolves.toEqual([]);
    expect(updates).toHaveLength(0);
  });
});

describe("restoreSubtree", () => {
  it("refuses a page that is not in the trash", async () => {
    findFirst.kbPages = { id: 5, parentPageId: null, deletedAt: null };
    await expect(restoreSubtree("org-a", 5, "u1")).resolves.toEqual({
      restored: [],
      reparented: [],
    });
  });

  it("restores the subtree", async () => {
    findFirst.kbPages = { id: 5, parentPageId: null, deletedAt: new Date() };
    subtree.mockResolvedValue([5, 6]);
    const result = await restoreSubtree("org-a", 5, "u1");
    expect(result.restored).toEqual([5, 6]);
    expect(updates.at(-1)).toMatchObject({ deletedAt: null, deletedById: null });
  });

  it("re-parents to the root when the old parent is still deleted", async () => {
    // The page, then its parent lookup: both answered by the same stub, which
    // is a page that is itself still deleted.
    findFirst.kbPages = { id: 5, parentPageId: 9, deletedAt: new Date() };
    subtree.mockResolvedValue([5]);
    const result = await restoreSubtree("org-a", 5, "u1");
    expect(result.reparented).toEqual([5]);
    expect(updates[0]).toMatchObject({ parentPageId: null });
  });
});
