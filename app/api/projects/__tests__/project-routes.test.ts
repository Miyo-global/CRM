import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.fn();
const resolveAccess = vi.fn();
const findTicket = vi.fn();
const findProject = vi.fn();
const findComment = vi.fn();
const findIntake = vi.fn();
const findMember = vi.fn();
const updateReturning = vi.fn();
const selectRows = vi.fn();

function chain(result: () => unknown) {
  const target: Record<string, unknown> = {};
  const proxy: unknown = new Proxy(target, {
    get(_t, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
          Promise.resolve().then(result).then(resolve, reject);
      }
      if (prop === "returning") return () => Promise.resolve().then(() => updateReturning());
      return () => proxy;
    },
  });
  return proxy;
}

vi.mock("server-only", () => ({}));
vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/email", () => ({
  sendTicketAssignmentEmail: vi.fn(),
  sendTicketReviewRequestEmail: vi.fn(),
  sendTicketChangesRequestedEmail: vi.fn(),
  sendTicketCommentEmail: vi.fn(async () => undefined),
}));
vi.mock("@/server/actions/create-notification", () => ({ createNotification: vi.fn() }));
vi.mock("@/lib/projects/project-access", () => ({ resolveProjectAccess: (...a: unknown[]) => resolveAccess(...a) }));
vi.mock("@/lib/projects/record-ticket-activity", () => ({ recordTicketActivity: vi.fn(), diffTicketActivity: () => [] }));
vi.mock("@/lib/projects/assignable-users", () => ({ allOrgMembers: vi.fn(async () => true) }));
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      tickets: { findFirst: (...a: unknown[]) => findTicket(...a) },
      projects: { findFirst: (...a: unknown[]) => findProject(...a) },
      ticketComments: { findFirst: (...a: unknown[]) => findComment(...a) },
      intakeItems: { findFirst: (...a: unknown[]) => findIntake(...a) },
      projectMembers: { findFirst: (...a: unknown[]) => findMember(...a) },
    },
    update: () => chain(() => undefined),
    insert: () => chain(() => undefined),
    delete: () => chain(() => undefined),
    select: () => chain(() => selectRows()),
    transaction: async (fn: (tx: unknown) => unknown) =>
      fn({
        execute: async () => undefined,
        select: () => chain(() => selectRows()),
        update: () => chain(() => undefined),
        delete: () => chain(() => undefined),
      }),
  },
}));

function signIn(role: string | null = "ENGINEERING") {
  authMock.mockResolvedValue(role === null ? null : { user: { id: "u1", role, isActive: true, name: "Asha" }, orgId: "org1" });
}

function allow(role: string) {
  resolveAccess.mockImplementation(async (_s: unknown, _p: number, action: string) => {
    const rank: Record<string, number> = { VIEWER: 0, CONTRIBUTOR: 1, MANAGER: 2, OWNER: 2 };
    const need: Record<string, number> = { view: 0, contribute: 1, manage: 2 };
    return rank[role] >= need[action] ? { ok: true, role } : { ok: false, status: 403 };
  });
}

const json = (body: unknown, method = "PATCH") =>
  ({ method, body: JSON.stringify(body), headers: { "content-type": "application/json" } }) as const;
const req = (path: string, init?: ConstructorParameters<typeof NextRequest>[1]) => new NextRequest(`http://localhost${path}`, init);
const p = <T extends Record<string, string>>(v: T) => ({ params: Promise.resolve(v) });

beforeEach(() => {
  vi.clearAllMocks();
  signIn();
  allow("CONTRIBUTOR");
});

describe("ticket PATCH", () => {
  const load = () => import("@/app/api/projects/[projectId]/tickets/[ticketId]/route");

  it("returns 401 when signed out", async () => {
    signIn(null);
    const { PATCH } = await load();
    expect((await PATCH(req("/x", json({ title: "a" })), p({ projectId: "1", ticketId: "2" }))).status).toBe(401);
  });

  it("returns 404 for a non-numeric project id", async () => {
    const { PATCH } = await load();
    expect((await PATCH(req("/x", json({ title: "a" })), p({ projectId: "abc", ticketId: "2" }))).status).toBe(404);
    expect(resolveAccess).not.toHaveBeenCalled();
  });

  it("returns 404 for a project in another org", async () => {
    resolveAccess.mockResolvedValue({ ok: false, status: 404 });
    const { PATCH } = await load();
    expect((await PATCH(req("/x", json({ title: "a" })), p({ projectId: "1", ticketId: "2" }))).status).toBe(404);
  });

  it("returns 403 for a viewer", async () => {
    allow("VIEWER");
    const { PATCH } = await load();
    expect((await PATCH(req("/x", json({ title: "a" })), p({ projectId: "1", ticketId: "2" }))).status).toBe(403);
  });

  it("returns 400 for unknown fields and bad JSON", async () => {
    const { PATCH } = await load();
    expect((await PATCH(req("/x", json({ nope: 1 })), p({ projectId: "1", ticketId: "2" }))).status).toBe(400);
    const bad = req("/x", { method: "PATCH", body: "{not json", headers: { "content-type": "application/json" } });
    expect((await PATCH(bad, p({ projectId: "1", ticketId: "2" }))).status).toBe(400);
  });

  it("returns 404 for a missing ticket", async () => {
    findTicket.mockResolvedValue(undefined);
    const { PATCH } = await load();
    expect((await PATCH(req("/x", json({ title: "a" })), p({ projectId: "1", ticketId: "2" }))).status).toBe(404);
  });

  it("returns 409 with the current version on a stale write", async () => {
    findTicket.mockResolvedValue({ id: 2, version: 5 });
    const { PATCH } = await load();
    const res = await PATCH(req("/x", json({ title: "a", version: 4 })), p({ projectId: "1", ticketId: "2" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "PROJECTS_TICKET_CONFLICT", currentVersion: 5 });
  });

  it("returns 409 when the version changes between read and write", async () => {
    findTicket.mockResolvedValueOnce({ id: 2, version: 4 }).mockResolvedValueOnce({ version: 5 });
    updateReturning.mockResolvedValue([]);
    const { PATCH } = await load();
    const res = await PATCH(req("/x", json({ title: "a", version: 4 })), p({ projectId: "1", ticketId: "2" }));
    expect(res.status).toBe(409);
  });

  it("returns the new version on success", async () => {
    findTicket.mockResolvedValue({ id: 2, version: 4, title: "old" });
    updateReturning.mockResolvedValue([{ id: 2, version: 5, title: "a" }]);
    const { PATCH } = await load();
    const res = await PATCH(req("/x", json({ title: "a", version: 4 })), p({ projectId: "1", ticketId: "2" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ticket: { version: 5 } });
  });
});

describe("ticket by key", () => {
  const load = () => import("@/app/api/projects/[projectId]/tickets/key/[ticketKey]/route");

  it("returns 404 for another project's key", async () => {
    findProject.mockResolvedValue({ key: "WEB" });
    const { GET } = await load();
    expect((await GET(req("/x"), p({ projectId: "1", ticketKey: "API-3" }))).status).toBe(404);
    expect(findTicket).not.toHaveBeenCalled();
  });

  it("finds a ticket by key", async () => {
    findProject.mockResolvedValue({ key: "WEB" });
    findTicket.mockResolvedValue({ id: 9, ticketNumber: 3, title: "t" });
    const { GET } = await load();
    const res = await GET(req("/x"), p({ projectId: "1", ticketKey: "WEB-3" }));
    expect(await res.json()).toMatchObject({ id: 9 });
  });
});

describe("ticket delete permanently (BUG-33)", () => {
  const call = async () => {
    const { DELETE } = await import("@/app/api/projects/[projectId]/tickets/[ticketId]/route");
    return DELETE(req("/x?permanent=true", { method: "DELETE" }), p({ projectId: "1", ticketId: "2" }));
  };

  it.each(["CONTRIBUTOR", "MANAGER"])("forbids a project %s", async (role) => {
    allow(role);
    expect((await call()).status).toBe(403);
  });

  it("lets the project owner delete", async () => {
    allow("OWNER");
    findTicket.mockResolvedValue({ id: 2 });
    expect((await call()).status).toBe(200);
  });
});

describe("project rename (BUG-23)", () => {
  it("refuses a name another project in the org already uses", async () => {
    allow("MANAGER");
    findProject.mockResolvedValue({ id: 9 });
    const { PATCH } = await import("@/app/api/projects/[projectId]/route");
    const res = await PATCH(req("/x", json({ name: "qa-test project" })), p({ projectId: "1" }));
    expect(res.status).toBe(409);
  });
});

describe("project delete (BUG-33)", () => {
  const call = async () => {
    const { DELETE } = await import("@/app/api/projects/[projectId]/route");
    return DELETE(req("/x", { method: "DELETE" }), p({ projectId: "1" }));
  };

  it("forbids HR, who can manage projects but not delete them", async () => {
    signIn("HR");
    allow("OWNER");
    expect((await call()).status).toBe(403);
  });

  it.each(["ADMIN", "CEO"])("lets %s delete", async (role) => {
    signIn(role);
    allow("OWNER");
    findProject.mockResolvedValue({ name: "QA" });
    selectRows.mockResolvedValue([]);
    expect((await call()).status).toBe(200);
  });
});

describe("ticket restore", () => {
  const load = () => import("@/app/api/projects/[projectId]/tickets/[ticketId]/restore/route");

  it("returns 409 when the ticket is not archived", async () => {
    findTicket.mockResolvedValue({ id: 2, deletedAt: null });
    const { POST } = await load();
    expect((await POST(req("/x", { method: "POST" }), p({ projectId: "1", ticketId: "2" }))).status).toBe(409);
  });
});

describe("rank move", () => {
  const load = () => import("@/app/api/projects/[projectId]/tickets/[ticketId]/rank/route");

  it("returns 400 when a ticket is its own neighbour", async () => {
    const { PATCH } = await load();
    expect((await PATCH(req("/x", json({ beforeTicketId: 2 })), p({ projectId: "1", ticketId: "2" }))).status).toBe(400);
  });

  it("returns 400 for duplicate neighbours", async () => {
    const { PATCH } = await load();
    expect((await PATCH(req("/x", json({ beforeTicketId: 3, afterTicketId: 3 })), p({ projectId: "1", ticketId: "2" }))).status).toBe(400);
  });

  it("returns 403 for a viewer", async () => {
    allow("VIEWER");
    const { PATCH } = await load();
    expect((await PATCH(req("/x", json({})), p({ projectId: "1", ticketId: "2" }))).status).toBe(403);
  });
});

describe("activity feed", () => {
  it("returns 404 without access", async () => {
    resolveAccess.mockResolvedValue({ ok: false, status: 404 });
    const { GET } = await import("@/app/api/projects/[projectId]/activity/route");
    expect((await GET(req("/x"), p({ projectId: "1" }))).status).toBe(404);
  });

  it("caps the page size at 100 and returns a cursor", async () => {
    selectRows.mockResolvedValue(Array.from({ length: 101 }, (_, i) => ({ id: 500 - i })));
    const { GET } = await import("@/app/api/projects/[projectId]/activity/route");
    const body = await (await GET(req("/x?limit=5000"), p({ projectId: "1" }))).json();
    expect(body.data).toHaveLength(100);
    expect(body.nextCursor).toBe(401);
  });
});

describe("members", () => {
  const load = () => import("@/app/api/projects/[projectId]/members/route");

  it("returns 403 for a contributor changing roles", async () => {
    const { PATCH } = await load();
    expect((await PATCH(req("/x", json({ userId: "u2", role: "VIEWER" })), p({ projectId: "1" }))).status).toBe(403);
  });

  it("rejects an unknown role", async () => {
    allow("MANAGER");
    const { PATCH } = await load();
    expect((await PATCH(req("/x", json({ userId: "u2", role: "GOD" })), p({ projectId: "1" }))).status).toBe(400);
  });

  it("stops a manager from granting OWNER", async () => {
    allow("MANAGER");
    const { PATCH } = await load();
    expect((await PATCH(req("/x", json({ userId: "u2", role: "OWNER" })), p({ projectId: "1" }))).status).toBe(403);
  });

  it("blocks removing the last manager", async () => {
    allow("MANAGER");
    findMember.mockResolvedValue({ id: 1 });
    findProject.mockResolvedValue({ managerId: null });
    selectRows.mockResolvedValue([{ userId: "u2", role: "MANAGER" }]);
    const { DELETE } = await load();
    const res = await DELETE(req("/x", json({ userId: "u2" }, "DELETE")), p({ projectId: "1" }));
    expect(res.status).toBe(409);
  });
});

describe("comments", () => {
  it("rejects replies to replies", async () => {
    findTicket.mockResolvedValue({ id: 2, title: "t" });
    findComment.mockResolvedValue({ parentCommentId: 7 });
    const { POST } = await import("@/app/api/projects/[projectId]/tickets/[ticketId]/comments/route");
    const res = await POST(req("/x", json({ content: "hi", parentCommentId: 8 }, "POST")), p({ projectId: "1", ticketId: "2" }));
    expect(res.status).toBe(400);
  });

  it("forbids deleting someone else's comment", async () => {
    findTicket.mockResolvedValue({ id: 2, title: "t" });
    findComment.mockResolvedValue({ id: 5, userId: "other", deletedAt: null, parentCommentId: null });
    const { DELETE } = await import("@/app/api/projects/[projectId]/tickets/[ticketId]/comments/[commentId]/route");
    expect((await DELETE(req("/x"), p({ projectId: "1", ticketId: "2", commentId: "5" }))).status).toBe(403);
  });

  it("rejects an invalid reaction", async () => {
    findTicket.mockResolvedValue({ id: 2, title: "t" });
    findComment.mockResolvedValue({ id: 5, userId: "u1", deletedAt: null, parentCommentId: null });
    const { POST } = await import("@/app/api/projects/[projectId]/tickets/[ticketId]/comments/[commentId]/reactions/route");
    const res = await POST(req("/x", json({ emoji: "<script>" }, "POST")), p({ projectId: "1", ticketId: "2", commentId: "5" }));
    expect(res.status).toBe(400);
  });
});

describe("intake decisions", () => {
  const load = () => import("@/app/api/projects/[projectId]/intake/[requestId]/route");

  it("requires a decline reason", async () => {
    findIntake.mockResolvedValue({ id: 3, status: "pending" });
    const { PATCH } = await load();
    expect((await PATCH(req("/x", json({ status: "declined" })), p({ projectId: "1", requestId: "3" }))).status).toBe(400);
  });

  it("returns 409 for an already processed request", async () => {
    findIntake.mockResolvedValue({ id: 3, status: "accepted" });
    const { PATCH } = await load();
    expect((await PATCH(req("/x", json({ status: "accepted" })), p({ projectId: "1", requestId: "3" }))).status).toBe(409);
  });

  it("rejects accept-only fields on decline", async () => {
    findIntake.mockResolvedValue({ id: 3, status: "pending" });
    const { PATCH } = await load();
    const res = await PATCH(req("/x", json({ status: "declined", declineReason: "no", priority: "HIGH" })), p({ projectId: "1", requestId: "3" }));
    expect(res.status).toBe(400);
  });
});
