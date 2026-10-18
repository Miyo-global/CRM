import { beforeEach, describe, expect, it, vi } from "vitest";

import { harness, kbMocks, kbRequest } from "@/test/kb-route-harness";

vi.mock("@/lib/auth", () => kbMocks.auth());
vi.mock("@/lib/org-features", () => kbMocks.orgFeatures());
vi.mock("@/lib/knowledge/actor", (importOriginal) => kbMocks.actor(importOriginal));
vi.mock("@/lib/audit-log", () => kbMocks.auditLog());
vi.mock("@/lib/logger", () => kbMocks.logger());
vi.mock("@/lib/db", () => kbMocks.db());

const { POST } = await import("../[spaceId]/members/route");
const { DELETE } = await import("../[spaceId]/members/[memberId]/route");

const params = (spaceId: string, memberId?: string) => ({
  params: Promise.resolve(memberId ? { spaceId, memberId } : { spaceId }),
});

const space = { id: 3, orgId: "org-a", deletedAt: null, createdById: "someone-else" };

beforeEach(() => {
  harness.reset();
  harness.findFirst = { kbSpaces: space, organizationMembers: { id: 1 } };
});

describe("POST space members", () => {
  const url = "/api/knowledge/spaces/3/members";

  it("answers 403 for someone who can see the space but not manage it", async () => {
    harness.permissions = ["kb:spaces:view"];
    harness.findMany = { kbSpaceMembers: [] };
    const res = await POST(
      kbRequest(url, { method: "POST", body: { userId: "u2", spaceRole: "editor" } }) as never,
      params("3") as never,
    );
    expect(res.status).toBe(403);
  });

  it("answers 404, not 403, for someone with no route to the space at all", async () => {
    harness.findMany = { kbSpaceMembers: [] };
    const res = await POST(
      kbRequest(url, { method: "POST", body: { userId: "u2" } }) as never,
      params("3") as never,
    );
    expect(res.status).toBe(404);
  });

  it("answers 404 for a space in another org", async () => {
    harness.permissions = ["kb:pages:manage"];
    harness.findFirst = { kbSpaces: { ...space, orgId: "org-b" } };
    const res = await POST(
      kbRequest(url, { method: "POST", body: { userId: "u2" } }) as never,
      params("3") as never,
    );
    expect(res.status).toBe(404);
  });

  it("answers 400 when a seat names both a person and a role, or neither", async () => {
    harness.permissions = ["kb:pages:manage"];
    for (const body of [{ userId: "u2", role: "SALES" }, {}]) {
      const res = await POST(
        kbRequest(url, { method: "POST", body }) as never,
        params("3") as never,
      );
      expect(res.status).toBe(400);
    }
  });

  it("answers 404 when the person is in another org", async () => {
    harness.permissions = ["kb:pages:manage"];
    harness.findFirst = { kbSpaces: space, organizationMembers: undefined };
    const res = await POST(
      kbRequest(url, { method: "POST", body: { userId: "outsider" } }) as never,
      params("3") as never,
    );
    expect(res.status).toBe(404);
  });

  it("seats an editor and audits it", async () => {
    harness.permissions = ["kb:pages:manage"];
    harness.insertReturns = [[{ id: 11, spaceId: 3, userId: "u2", spaceRole: "editor" }]];

    const res = await POST(
      kbRequest(url, { method: "POST", body: { userId: "u2", spaceRole: "editor" } }) as never,
      params("3") as never,
    );

    expect(res.status).toBe(201);
    expect(harness.inserts[0].rows).toMatchObject({ spaceId: 3, userId: "u2", spaceRole: "editor" });
    expect(harness.audits[0]).toMatchObject({ action: "kb.member.added" });
  });

  it("answers 409 when that person already holds a seat", async () => {
    harness.permissions = ["kb:pages:manage"];
    harness.insertReturns = [[]];
    const res = await POST(
      kbRequest(url, { method: "POST", body: { userId: "u2" } }) as never,
      params("3") as never,
    );
    expect(res.status).toBe(409);
  });
});

describe("DELETE a space member", () => {
  const url = "/api/knowledge/spaces/3/members/11";

  it("refuses to remove the last admin", async () => {
    harness.permissions = ["kb:pages:manage"];
    harness.selectRows = [[{ id: 11, spaceRole: "admin" }, { id: 12, spaceRole: "editor" }]];

    const res = await DELETE(
      kbRequest(url, { method: "DELETE" }) as never,
      params("3", "11") as never,
    );

    expect(res.status).toBe(409);
    expect(harness.deletes).toBe(0);
  });

  it("removes an admin while another remains", async () => {
    harness.permissions = ["kb:pages:manage"];
    harness.selectRows = [[{ id: 11, spaceRole: "admin" }, { id: 12, spaceRole: "admin" }]];

    const res = await DELETE(
      kbRequest(url, { method: "DELETE" }) as never,
      params("3", "11") as never,
    );

    expect(res.status).toBe(200);
    expect(harness.deletes).toBe(1);
    expect(harness.audits[0]).toMatchObject({ action: "kb.member.removed" });
  });

  it("answers 404 for a seat that is not in this space", async () => {
    harness.permissions = ["kb:pages:manage"];
    harness.selectRows = [[{ id: 99, spaceRole: "admin" }]];
    const res = await DELETE(
      kbRequest(url, { method: "DELETE" }) as never,
      params("3", "11") as never,
    );
    expect(res.status).toBe(404);
  });
});
