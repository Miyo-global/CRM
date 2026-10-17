import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.fn();
const resolveAccess = vi.fn();
const findUser = vi.fn();
const findOrgMember = vi.fn();
const createInvitation = vi.fn();
const returning = vi.fn();
const findStatus = vi.fn();
const ticketUpdate = vi.fn();

function chain() {
  const proxy: unknown = new Proxy(
    {},
    { get: (_t, prop) => (prop === "returning" ? () => returning() : prop === "then" ? undefined : () => proxy) },
  );
  return proxy;
}

vi.mock("server-only", () => ({}));
vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/projects/project-access", () => ({ resolveProjectAccess: (...a: unknown[]) => resolveAccess(...a) }));
vi.mock("@/lib/org/create-invitation", () => ({ createOrgInvitation: (...a: unknown[]) => createInvitation(...a) }));
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: { findFirst: (...a: unknown[]) => findUser(...a) },
      organizationMembers: { findFirst: (...a: unknown[]) => findOrgMember(...a) },
    },
    insert: () => chain(),
    update: () => chain(),
    transaction: (fn: (tx: unknown) => unknown) =>
      fn({
        query: { projectStatuses: { findFirst: (...a: unknown[]) => findStatus(...a) } },
        update: (table: { status?: unknown }) => {
          // tickets has a status column; project_statuses does not.
          if (table && "status" in table) ticketUpdate();
          return chain();
        },
      }),
  },
}));

function signIn(role: string) {
  authMock.mockResolvedValue({ user: { id: "u1", role, isActive: true }, orgId: "org1" });
}
const json = (body: unknown, method = "POST") =>
  ({ method, body: JSON.stringify(body), headers: { "content-type": "application/json" } }) as const;
const req = (init: ConstructorParameters<typeof NextRequest>[1]) => new NextRequest("http://localhost/x", init);
const p = <T extends Record<string, string>>(v: T) => ({ params: Promise.resolve(v) });

beforeEach(() => {
  vi.clearAllMocks();
  signIn("ENGINEERING");
  resolveAccess.mockResolvedValue({ ok: true, role: "MANAGER" });
});

describe("project invite", () => {
  const load = () => import("@/app/api/projects/[projectId]/members/invite/route");

  it("returns 403 for a contributor", async () => {
    resolveAccess.mockResolvedValue({ ok: false, status: 403 });
    const { POST } = await load();
    expect((await POST(req(json({ email: "a@x.io" })), p({ projectId: "1" }))).status).toBe(403);
  });

  it("rejects a bad email", async () => {
    const { POST } = await load();
    expect((await POST(req(json({ email: "nope" })), p({ projectId: "1" }))).status).toBe(400);
  });

  it("adds an existing org member directly", async () => {
    findUser.mockResolvedValue({ id: "u2" });
    findOrgMember.mockResolvedValue({ id: 9 });
    returning.mockResolvedValue([{ userId: "u2" }]);
    const { POST } = await load();
    const res = await POST(req(json({ email: "b@x.io" })), p({ projectId: "1" }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ added: true, invited: false });
    expect(createInvitation).not.toHaveBeenCalled();
  });

  it("returns 409 when the person is already on the project", async () => {
    findUser.mockResolvedValue({ id: "u2" });
    findOrgMember.mockResolvedValue({ id: 9 });
    returning.mockResolvedValue([]);
    const { POST } = await load();
    expect((await POST(req(json({ email: "b@x.io" })), p({ projectId: "1" }))).status).toBe(409);
  });

  it("lets only org admins invite people from outside the org", async () => {
    findUser.mockResolvedValue(undefined);
    const { POST } = await load();
    expect((await POST(req(json({ email: "new@x.io" })), p({ projectId: "1" }))).status).toBe(403);
    signIn("ADMIN");
    createInvitation.mockResolvedValue({ ok: true, invitationId: "i1" });
    const res = await POST(req(json({ email: "new@x.io", role: "VIEWER" })), p({ projectId: "1" }));
    expect(res.status).toBe(201);
    expect(createInvitation).toHaveBeenCalledWith(expect.objectContaining({ projectId: 1, projectRole: "VIEWER" }));
  });
});

describe("column WIP limit", () => {
  const load = () => import("@/app/api/projects/[projectId]/statuses/[statusId]/route");

  it("rejects zero and fractions", async () => {
    const { PATCH } = await load();
    for (const wipLimit of [0, 1.5, -2]) {
      expect((await PATCH(req(json({ wipLimit }, "PATCH")), p({ projectId: "1", statusId: "3" }))).status).toBe(400);
    }
  });

  it("returns 404 for a column in another project", async () => {
    findStatus.mockResolvedValue(undefined);
    const { PATCH } = await load();
    expect((await PATCH(req(json({ wipLimit: 3 }, "PATCH")), p({ projectId: "1", statusId: "3" }))).status).toBe(404);
  });

  it("clears the limit with null", async () => {
    findStatus.mockResolvedValue({ name: "DOING" });
    returning.mockResolvedValue([{ id: 3, name: "DOING", wipLimit: null }]);
    const { PATCH } = await load();
    expect((await PATCH(req(json({ wipLimit: null }, "PATCH")), p({ projectId: "1", statusId: "3" }))).status).toBe(200);
    expect(ticketUpdate).not.toHaveBeenCalled();
  });

  it("renames the column and its tickets together (MIYO-0070)", async () => {
    findStatus.mockResolvedValueOnce({ name: "DOING" }).mockResolvedValueOnce(undefined);
    returning.mockResolvedValue([{ id: 3, name: "IN_FLIGHT", wipLimit: null }]);
    const { PATCH } = await load();
    expect((await PATCH(req(json({ name: "In flight" }, "PATCH")), p({ projectId: "1", statusId: "3" }))).status).toBe(200);
    expect(ticketUpdate).toHaveBeenCalledOnce();
  });

  it("rejects a rename onto an existing column", async () => {
    findStatus.mockResolvedValueOnce({ name: "DOING" }).mockResolvedValueOnce({ id: 9 });
    const { PATCH } = await load();
    expect((await PATCH(req(json({ name: "DONE" }, "PATCH")), p({ projectId: "1", statusId: "3" }))).status).toBe(409);
  });
});
