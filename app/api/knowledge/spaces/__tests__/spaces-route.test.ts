import { beforeEach, describe, expect, it, vi } from "vitest";

import { harness, kbMocks, kbRequest } from "@/test/kb-route-harness";

vi.mock("@/lib/auth", () => kbMocks.auth());
vi.mock("@/lib/org-features", () => kbMocks.orgFeatures());
vi.mock("@/lib/knowledge/actor", (importOriginal) => kbMocks.actor(importOriginal));
vi.mock("@/lib/audit-log", () => kbMocks.auditLog());
vi.mock("@/lib/logger", () => kbMocks.logger());
vi.mock("@/lib/db", () => kbMocks.db());

const { GET, POST } = await import("../route");

beforeEach(() => {
  harness.reset();
});

describe("GET /api/knowledge/spaces", () => {
  it("answers 401 when signed out", async () => {
    harness.session = null;
    const res = await GET(kbRequest("/api/knowledge/spaces") as never);
    expect(res.status).toBe(401);
  });

  it("answers 404 when the module is off for the org", async () => {
    harness.flags.knowledgeBase = false;
    const res = await GET(kbRequest("/api/knowledge/spaces") as never);
    expect(res.status).toBe(404);
  });

  it("lists spaces for a signed-in employee", async () => {
    harness.selectRows = [[{ id: 1, name: "Handbook", type: "team", mySpaceRole: null }]];
    const res = await GET(kbRequest("/api/knowledge/spaces") as never);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toHaveLength(1);
  });

  it("hides another person's private space", async () => {
    harness.selectRows = [
      [
        { id: 1, name: "Handbook", type: "team", mySpaceRole: null },
        { id: 2, name: "Their notes", type: "private", mySpaceRole: null },
        { id: 3, name: "My notes", type: "private", mySpaceRole: "admin" },
      ],
    ];
    const res = await GET(kbRequest("/api/knowledge/spaces") as never);
    const body = (await res.json()) as Array<{ id: number }>;
    expect(body.map((s) => s.id)).toEqual([1, 3]);
  });
});

describe("POST /api/knowledge/spaces", () => {
  const body = { name: "Engineering handbook" };

  it("answers 403 without kb:spaces:manage", async () => {
    const res = await POST(kbRequest("/api/knowledge/spaces", { method: "POST", body }) as never);
    expect(res.status).toBe(403);
  });

  it("answers 400 for an unknown field", async () => {
    harness.permissions = ["kb:spaces:manage"];
    const res = await POST(
      kbRequest("/api/knowledge/spaces", {
        method: "POST",
        body: { ...body, colour: "gold" },
      }) as never,
    );
    expect(res.status).toBe(400);
  });

  it("answers 400 for a missing name and for a bad slug", async () => {
    harness.permissions = ["kb:spaces:manage"];
    const missing = await POST(
      kbRequest("/api/knowledge/spaces", { method: "POST", body: {} }) as never,
    );
    expect(missing.status).toBe(400);

    const badSlug = await POST(
      kbRequest("/api/knowledge/spaces", {
        method: "POST",
        body: { ...body, slug: "Not A Slug" },
      }) as never,
    );
    expect(badSlug.status).toBe(400);
  });

  it("creates the space, seats the creator as its admin, and audits it", async () => {
    harness.permissions = ["kb:spaces:manage"];
    harness.selectRows = [[]];
    harness.insertReturns = [[{ id: 7, name: body.name, slug: "engineering-handbook", type: "team" }]];

    const res = await POST(kbRequest("/api/knowledge/spaces", { method: "POST", body }) as never);

    expect(res.status).toBe(201);
    expect(harness.inserts[0].rows).toMatchObject({
      orgId: "org-a",
      slug: "engineering-handbook",
      createdById: "u1",
    });
    expect(harness.inserts[1].rows).toMatchObject({ spaceId: 7, userId: "u1", spaceRole: "admin" });
    expect(harness.audits[0]).toMatchObject({ action: "kb.space.created", targetId: "7" });
  });

  it("answers 409 when the slug is taken", async () => {
    harness.permissions = ["kb:spaces:manage"];
    harness.selectRows = [[]];
    harness.insertReturns = [[]];

    const res = await POST(
      kbRequest("/api/knowledge/spaces", { method: "POST", body: { ...body, slug: "taken" } }) as never,
    );
    expect(res.status).toBe(409);
  });
});
