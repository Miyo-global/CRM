import { beforeEach, describe, expect, it, vi } from "vitest";

import { harness, kbMocks, kbRequest } from "@/test/kb-route-harness";

vi.mock("@/lib/auth", () => kbMocks.auth());
vi.mock("@/lib/org-features", () => kbMocks.orgFeatures());
vi.mock("@/lib/knowledge/actor", (importOriginal) => kbMocks.actor(importOriginal));
vi.mock("@/lib/audit-log", () => kbMocks.auditLog());
vi.mock("@/lib/logger", () => kbMocks.logger());
vi.mock("@/lib/db", () => kbMocks.db());

const access = vi.fn();
const commit = vi.fn();

vi.mock("@/lib/knowledge/authorization", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, resolvePageAccess: (...a: unknown[]) => access(...a) };
});

vi.mock("@/lib/knowledge/page-writer", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, commitPageChange: (...a: unknown[]) => commit(...a) };
});

vi.mock("@/lib/knowledge/tree", () => ({
  getAncestors: async () => [{ id: 2, title: "Handbook" }],
  nextSortOrder: async () => 3,
}));

vi.mock("@/lib/knowledge/space-lifecycle", () => ({
  isPageSpaceArchived: async () => harness.flags.spaceArchived === true,
}));

vi.mock("@/lib/knowledge/events", () => ({ logKbEvent: async () => undefined }));

const { POST, GET: GET_LIST } = await import("../route");
const { GET, PATCH } = await import("../[pageId]/route");
const { KbPageConflictError } = await import("@/lib/knowledge/page-writer");

const params = (pageId: string) => ({ params: Promise.resolve({ pageId }) });

const page = {
  id: 5,
  orgId: "org-a",
  spaceId: 3,
  projectId: null,
  title: "Leave policy",
  visibility: "org",
  ownerUserId: null,
  createdById: "u1",
  deletedAt: null,
  isLocked: false,
  contentRevision: 4,
};

beforeEach(() => {
  harness.reset();
  access.mockReset();
  commit.mockReset();
  harness.findFirst = { kbPages: page };
  access.mockResolvedValue({
    outcome: "allowed",
    scope: { orgId: "org-a", pageId: "5", action: "edit", via: "space" },
  });
  commit.mockResolvedValue({
    contentRevision: 5,
    contentText: "body",
    excerpt: "body",
    newMentions: [],
    reindex: true,
  });
});

describe("POST /api/knowledge/pages", () => {
  it("answers 404 for a parent in another org", async () => {
    harness.findFirst = { kbPages: undefined };
    const res = await POST(
      kbRequest("/api/knowledge/pages", { method: "POST", body: { title: "x", parentPageId: 9 } }) as never,
    );
    expect(res.status).toBe(404);
  });

  it("answers 403 when the caller cannot edit the parent", async () => {
    access.mockResolvedValue({ outcome: "denied", reason: "no" });
    const res = await POST(
      kbRequest("/api/knowledge/pages", { method: "POST", body: { title: "x", parentPageId: 9 } }) as never,
    );
    expect(res.status).toBe(403);
  });

  it("answers 403 for a loose page without kb:pages:create", async () => {
    const res = await POST(
      kbRequest("/api/knowledge/pages", { method: "POST", body: { title: "x" } }) as never,
    );
    expect(res.status).toBe(403);
  });

  it("answers 400 for an unknown field", async () => {
    harness.permissions = ["kb:pages:create"];
    const res = await POST(
      kbRequest("/api/knowledge/pages", { method: "POST", body: { title: "x", colour: "gold" } }) as never,
    );
    expect(res.status).toBe(400);
  });

  it("copies a template's content and counts the use", async () => {
    harness.permissions = ["kb:pages:create"];
    harness.findFirst = {
      kbPageTemplates: { id: 2, content: [{ type: "p", children: [{ text: "From template" }] }] },
    };
    harness.insertReturns = [[{ id: 11 }]];

    const res = await POST(
      kbRequest("/api/knowledge/pages", {
        method: "POST",
        body: { title: "SOP", templateId: 2 },
      }) as never,
    );

    expect(res.status).toBe(201);
    expect(harness.inserts[0].rows).toMatchObject({ contentText: "From template" });
    // use_count and last_used_at are bumped on the template.
    expect(harness.updates[0]).toHaveProperty("lastUsedAt");
    expect(harness.audits[0]).toMatchObject({ action: "kb.page.created" });
  });

  it("answers 403 when the space is archived", async () => {
    harness.permissions = ["kb:pages:create"];
    harness.findFirst = { kbSpaces: { id: 3, defaultVisibility: "org", archivedAt: new Date(), deletedAt: null } };
    const res = await POST(
      kbRequest("/api/knowledge/pages", { method: "POST", body: { title: "x", spaceId: 3 } }) as never,
    );
    expect(res.status).toBe(403);
  });
});

describe("GET /api/knowledge/pages/[pageId]", () => {
  it("answers 404 for another org's page", async () => {
    access.mockResolvedValue({ outcome: "notFound" });
    const res = await GET(kbRequest("/api/knowledge/pages/5") as never, params("5") as never);
    expect(res.status).toBe(404);
  });

  it("returns the page with breadcrumbs, access and capabilities", async () => {
    const res = await GET(kbRequest("/api/knowledge/pages/5") as never, params("5") as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      myAccess: string;
      breadcrumbs: unknown[];
      capabilities: Record<string, boolean>;
    };
    expect(body.myAccess).toBe("edit");
    expect(body.breadcrumbs).toHaveLength(1);
    expect(body.capabilities).toEqual({ comment: true, edit: true, manage: false });
  });

  it("drops the write capabilities when the space is archived", async () => {
    harness.flags.spaceArchived = true;
    const res = await GET(kbRequest("/api/knowledge/pages/5") as never, params("5") as never);
    const body = (await res.json()) as { capabilities: Record<string, boolean> };
    expect(body.capabilities).toEqual({ comment: false, edit: false, manage: false });
  });
});

describe("PATCH /api/knowledge/pages/[pageId]", () => {
  const url = "/api/knowledge/pages/5";

  it("saves and reports the new revision", async () => {
    const res = await PATCH(
      kbRequest(url, { method: "PATCH", body: { title: "Renamed", expectedRevision: 4 } }) as never,
      params("5") as never,
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ contentRevision: 5 });
    expect(commit.mock.calls[0][0]).toMatchObject({ expectedRevision: 4, title: "Renamed" });
  });

  it("answers 409 KB_PAGE_CONFLICT on a stale revision", async () => {
    commit.mockRejectedValueOnce(new KbPageConflictError(7));
    const res = await PATCH(
      kbRequest(url, { method: "PATCH", body: { title: "x", expectedRevision: 2 } }) as never,
      params("5") as never,
    );
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      code: "KB_PAGE_CONFLICT",
      currentRevision: 7,
    });
  });

  it("answers 403 for an editor on a locked page", async () => {
    harness.findFirst = { kbPages: { ...page, isLocked: true } };
    const res = await PATCH(
      kbRequest(url, { method: "PATCH", body: { title: "x" } }) as never,
      params("5") as never,
    );
    expect(res.status).toBe(403);
    expect(commit).not.toHaveBeenCalled();
  });

  it("lets a manager edit a locked page", async () => {
    harness.findFirst = { kbPages: { ...page, isLocked: true } };
    access.mockResolvedValue({
      outcome: "allowed",
      scope: { orgId: "org-a", pageId: "5", action: "manage", via: "admin" },
    });
    const res = await PATCH(
      kbRequest(url, { method: "PATCH", body: { title: "x" } }) as never,
      params("5") as never,
    );
    expect(res.status).toBe(200);
  });

  it("answers 403 when the space is archived", async () => {
    harness.flags.spaceArchived = true;
    const res = await PATCH(
      kbRequest(url, { method: "PATCH", body: { title: "x" } }) as never,
      params("5") as never,
    );
    expect(res.status).toBe(403);
  });

  it("answers 400 for an unknown field and for an empty body", async () => {
    for (const body of [{ nope: 1 }, {}]) {
      const res = await PATCH(
        kbRequest(url, { method: "PATCH", body }) as never,
        params("5") as never,
      );
      expect(res.status).toBe(400);
    }
  });
});

describe("GET /api/knowledge/pages (the collection)", () => {
  beforeEach(() => {
    harness.selectRows = [[], []];
  });

  it("rejects a limit over the cap", async () => {
    const res = await GET_LIST(kbRequest("/api/knowledge/pages?limit=101") as never);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: expect.stringContaining("100") });
  });

  it("rejects an unknown scope, sort or status", async () => {
    for (const query of ["scope=nope", "sort=nope", "status=nope"]) {
      const res = await GET_LIST(kbRequest(`/api/knowledge/pages?${query}`) as never);
      expect(res.status, query).toBe(400);
    }
  });

  it("requires an id for the space and project scopes", async () => {
    for (const query of ["scope=space", "scope=project"]) {
      const res = await GET_LIST(kbRequest(`/api/knowledge/pages?${query}`) as never);
      expect(res.status, query).toBe(400);
    }
  });

  it("returns items, facets and a null cursor on a short page", async () => {
    harness.selectRows = [
      [
        {
          id: 1,
          title: "A",
          status: "published",
          contentType: "note",
          views: 2,
          createdAt: new Date("2026-10-01T00:00:00Z"),
          updatedAt: new Date("2026-10-02T00:00:00Z"),
        },
      ],
      [{ status: "published", contentType: "note", count: 1 }],
    ];

    const res = await GET_LIST(kbRequest("/api/knowledge/pages") as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: unknown[];
      nextCursor: string | null;
      facets: { status: Record<string, number>; contentType: Record<string, number> };
    };
    expect(body.items).toHaveLength(1);
    expect(body.nextCursor).toBeNull();
    expect(body.facets.status).toEqual({ published: 1 });
    expect(body.facets.contentType).toEqual({ note: 1 });
  });

  it("hands back a cursor that decodes to the last row when the page is full", async () => {
    const rows = Array.from({ length: 2 }, (_, i) => ({
      id: i + 1,
      title: `P${i}`,
      status: "draft",
      contentType: "note",
      views: 0,
      createdAt: new Date("2026-10-01T00:00:00Z"),
      updatedAt: new Date("2026-10-02T00:00:00Z"),
    }));
    harness.selectRows = [rows, []];

    const res = await GET_LIST(kbRequest("/api/knowledge/pages?limit=2") as never);
    const body = (await res.json()) as { nextCursor: string };
    const { decodeCursor } = await import("@/lib/knowledge/collection");
    expect(decodeCursor(body.nextCursor)).toEqual({
      id: 2,
      value: "2026-10-02T00:00:00.000Z",
    });
  });
});
