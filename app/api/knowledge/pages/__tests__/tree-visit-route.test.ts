import { beforeEach, describe, expect, it, vi } from "vitest";

import { harness, kbMocks, kbRequest } from "@/test/kb-route-harness";

vi.mock("@/lib/auth", () => kbMocks.auth());
vi.mock("@/lib/org-features", () => kbMocks.orgFeatures());
vi.mock("@/lib/knowledge/actor", (importOriginal) => kbMocks.actor(importOriginal));
vi.mock("@/lib/audit-log", () => kbMocks.auditLog());
vi.mock("@/lib/logger", () => kbMocks.logger());
vi.mock("@/lib/db", () => kbMocks.db());

const access = vi.fn();
vi.mock("@/lib/knowledge/authorization", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    resolvePageAccess: (...a: unknown[]) => access(...a),
    // The real predicate builds SQL against the mocked db; the shape of the
    // where clause is not what these tests are about.
    visiblePagesPredicate: () => ({ queryChunks: [] }),
  };
});

const { GET: TREE } = await import("../tree/route");
const { POST: VISIT } = await import("../[pageId]/visit/route");
const { TREE_NODE_CAP, VISIT_DEDUPE_MS } = await import("@/lib/knowledge/page-limits");
const { POST: FAVORITE, DELETE: UNFAVORITE } = await import("../[pageId]/favorite/route");

const params = (pageId: string) => ({ params: Promise.resolve({ pageId }) });

beforeEach(() => {
  harness.reset();
  access.mockReset();
  access.mockResolvedValue({
    outcome: "allowed",
    scope: { orgId: "org-a", pageId: "5", action: "view", via: "organization" },
  });
});

describe("GET /api/knowledge/pages/tree", () => {
  it("returns the flat node list", async () => {
    harness.selectRows = [[{ id: 1, parentPageId: null, title: "Root", hasChildren: true }]];
    const res = await TREE(kbRequest("/api/knowledge/pages/tree?spaceId=3") as never);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ truncated: false });
  });

  it("flags truncation past the node cap", async () => {
    harness.selectRows = [
      Array.from({ length: TREE_NODE_CAP + 1 }, (_, i) => ({ id: i + 1, parentPageId: null })),
    ];
    const res = await TREE(kbRequest("/api/knowledge/pages/tree") as never);
    const body = (await res.json()) as { nodes: unknown[]; truncated: boolean };
    expect(body.nodes).toHaveLength(TREE_NODE_CAP);
    expect(body.truncated).toBe(true);
  });
});

describe("POST /api/knowledge/pages/[pageId]/visit", () => {
  it("records a first visit", async () => {
    harness.findFirst = { kbPageVisits: undefined };
    const res = await VISIT(kbRequest("/api/knowledge/pages/5/visit", { method: "POST" }) as never, params("5") as never);
    await expect(res.json()).resolves.toMatchObject({ recorded: true });
    expect(harness.inserts).toHaveLength(1);
  });

  it("does not record again inside the five-minute window", async () => {
    harness.findFirst = { kbPageVisits: { id: 1, visitedAt: new Date(Date.now() - 60_000) } };
    const res = await VISIT(kbRequest("/api/knowledge/pages/5/visit", { method: "POST" }) as never, params("5") as never);
    await expect(res.json()).resolves.toMatchObject({ recorded: false });
    expect(harness.updates).toHaveLength(0);
  });

  it("moves the visit forward once the window has passed", async () => {
    harness.findFirst = {
      kbPageVisits: { id: 1, visitedAt: new Date(Date.now() - VISIT_DEDUPE_MS - 1_000) },
    };
    const res = await VISIT(kbRequest("/api/knowledge/pages/5/visit", { method: "POST" }) as never, params("5") as never);
    await expect(res.json()).resolves.toMatchObject({ recorded: true });
    expect(harness.updates).toHaveLength(1);
  });

  it("answers 404 for a page the caller cannot see", async () => {
    access.mockResolvedValue({ outcome: "notFound" });
    const res = await VISIT(kbRequest("/api/knowledge/pages/5/visit", { method: "POST" }) as never, params("5") as never);
    expect(res.status).toBe(404);
  });
});

describe("favourites", () => {
  it("needs view access to favourite", async () => {
    access.mockResolvedValue({ outcome: "denied", reason: "no" });
    const res = await FAVORITE(
      kbRequest("/api/knowledge/pages/5/favorite", { method: "POST" }) as never,
      params("5") as never,
    );
    expect(res.status).toBe(403);
  });

  it("removes only the caller's own row, with no access check", async () => {
    const res = await UNFAVORITE(
      kbRequest("/api/knowledge/pages/5/favorite", { method: "DELETE" }) as never,
      params("5") as never,
    );
    expect(res.status).toBe(200);
    expect(harness.deletes).toBe(1);
    expect(access).not.toHaveBeenCalled();
  });
});
