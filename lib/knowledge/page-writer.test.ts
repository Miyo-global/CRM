import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";

const findPage = vi.fn();
const findNewestVersion = vi.fn();
const findPages = vi.fn();
const inserted: Array<{ table: string; rows: unknown }> = [];
const updates: Array<Record<string, unknown>> = [];
const audits: Array<Record<string, unknown>> = [];
let auditOrder: string[] = [];

function fakeTx() {
  return {
    query: {
      kbPages: {
        findFirst: (...a: unknown[]) => findPage(...a),
        findMany: (...a: unknown[]) => findPages(...a),
      },
      kbPageVersions: { findFirst: (...a: unknown[]) => findNewestVersion(...a) },
    },
    insert: (table: unknown) => ({
      values: (rows: unknown) => {
        let name = "unknown";
        try {
          name = getTableName(table as Parameters<typeof getTableName>[0]);
        } catch {
          name = "unknown";
        }
        inserted.push({ table: name, rows });
        auditOrder.push(`insert:${name}`);
        return {
          onConflictDoNothing: async () => undefined,
          then: (resolve: (v: unknown) => unknown) => resolve(undefined),
        };
      },
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => {
        updates.push(values);
        auditOrder.push("update:kb_pages");
        return { where: async () => undefined };
      },
    }),
    delete: () => ({ where: async () => undefined }),
  };
}

vi.mock("@/lib/db", () => ({
  db: {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(fakeTx()),
  },
}));

vi.mock("@/lib/audit-log", () => ({
  createAuditLog: async (entry: Record<string, unknown>) => {
    audits.push(entry);
    auditOrder.push("audit");
  },
}));

vi.mock("@/lib/logger", () => ({ logger: { info: () => {}, warn: () => {}, error: () => {} } }));

const {
  commitPageChange,
  KbPageConflictError,
  needsSnapshot,
  VERSION_WINDOW_MS,
} = await import("./page-writer");

const paragraph = (text: string) => [{ type: "p", children: [{ text }] }];

beforeEach(() => {
  findPage.mockReset();
  findNewestVersion.mockReset();
  findPages.mockReset();
  inserted.length = 0;
  updates.length = 0;
  audits.length = 0;
  auditOrder = [];
  findPages.mockResolvedValue([]);
  findPage.mockResolvedValue({
    id: 5,
    title: "Leave policy",
    content: paragraph("old"),
    contentText: "old",
    contentRevision: 3,
  });
});

describe("needsSnapshot", () => {
  const now = new Date("2026-10-18T10:00:00Z");

  it("snapshots when there is no version yet", () => {
    expect(needsSnapshot(null, now)).toBe(true);
  });

  it("does not snapshot again inside the 10-minute window", () => {
    const oneMinuteAgo = new Date(now.getTime() - 60_000);
    expect(needsSnapshot({ createdAt: oneMinuteAgo }, now)).toBe(false);
  });

  it("snapshots once the window has passed", () => {
    const past = new Date(now.getTime() - VERSION_WINDOW_MS - 1);
    expect(needsSnapshot({ createdAt: past }, now)).toBe(true);
  });

  it("always snapshots when forced", () => {
    const oneMinuteAgo = new Date(now.getTime() - 60_000);
    expect(needsSnapshot({ createdAt: oneMinuteAgo }, now, true)).toBe(true);
  });
});

describe("commitPageChange", () => {
  const base = {
    orgId: "org-a",
    pageId: 5,
    actorId: "u1",
    action: "kb.page.updated" as const,
  };

  it("records one version for two edits a minute apart", async () => {
    findNewestVersion.mockResolvedValue({
      versionNumber: 1,
      createdAt: new Date(Date.now() - 60_000),
    });

    await commitPageChange({ ...base, content: paragraph("first") });
    await commitPageChange({ ...base, content: paragraph("second") });

    expect(inserted.filter((i) => i.table === "kb_page_versions")).toHaveLength(0);
  });

  it("records a version once the window has passed", async () => {
    findNewestVersion.mockResolvedValue({
      versionNumber: 2,
      createdAt: new Date(Date.now() - VERSION_WINDOW_MS - 1_000),
    });

    await commitPageChange({ ...base, content: paragraph("later") });

    const versions = inserted.filter((i) => i.table === "kb_page_versions");
    expect(versions).toHaveLength(1);
    expect(versions[0].rows).toMatchObject({ versionNumber: 3, title: "Leave policy" });
    // The snapshot holds what was replaced, not the replacement.
    expect(versions[0].rows).toMatchObject({ contentText: "old" });
  });

  it("records a version on a forced edit however recent the last one is", async () => {
    findNewestVersion.mockResolvedValue({ versionNumber: 9, createdAt: new Date() });

    await commitPageChange({ ...base, content: paragraph("published"), forceVersion: true });

    expect(inserted.filter((i) => i.table === "kb_page_versions")).toHaveLength(1);
  });

  it("recomputes the text and excerpt and bumps the revision", async () => {
    findNewestVersion.mockResolvedValue(undefined);

    const result = await commitPageChange({ ...base, content: paragraph("Ask HR first") });

    expect(result.contentRevision).toBe(4);
    expect(result.contentText).toBe("Ask HR first");
    expect(result.excerpt).toBe("Ask HR first");
    expect(updates[0]).toMatchObject({
      contentText: "Ask HR first",
      contentRevision: 4,
      lastEditedById: "u1",
    });
  });

  it("refuses an edit against a stale revision", async () => {
    findNewestVersion.mockResolvedValue(undefined);
    await expect(
      commitPageChange({ ...base, content: paragraph("x"), expectedRevision: 2 }),
    ).rejects.toBeInstanceOf(KbPageConflictError);
    expect(updates).toHaveLength(0);
  });

  it("reports only mentions the previous content did not have, and not the editor", async () => {
    findNewestVersion.mockResolvedValue(undefined);
    findPage.mockResolvedValue({
      id: 5,
      title: "T",
      content: [{ type: "p", children: [{ type: "mention", userId: "u2" }] }],
      contentText: "",
      contentRevision: 1,
    });

    const result = await commitPageChange({
      ...base,
      content: [
        { type: "p", children: [{ type: "mention", userId: "u2" }] },
        { type: "p", children: [{ type: "mention", userId: "u3" }] },
        { type: "p", children: [{ type: "mention", userId: "u1" }] },
      ],
    });

    expect(result.newMentions).toEqual(["u3"]);
  });

  it("writes the audit entry after the transaction, never inside it", async () => {
    findNewestVersion.mockResolvedValue(undefined);

    await commitPageChange({ ...base, content: paragraph("x") });

    expect(audits[0]).toMatchObject({
      action: "kb.page.updated",
      targetType: "kb_page",
      targetId: "5",
    });
    expect(auditOrder.at(-1)).toBe("audit");
  });

  it("leaves the content alone for a metadata-only change", async () => {
    findNewestVersion.mockResolvedValue(undefined);

    const result = await commitPageChange({ ...base, title: "Renamed" });

    expect(result.reindex).toBe(false);
    expect(updates[0]).toMatchObject({ title: "Renamed" });
    expect(updates[0]).not.toHaveProperty("contentText");
  });
});
