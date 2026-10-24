import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const findUser = vi.fn();
const findInvitation = vi.fn();
const findMember = vi.fn();
const deleted = vi.fn();
const transaction = vi.fn();
const insert = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/auth", () => ({ auth: async () => null, revokeAllUserSessions: async () => undefined }));
vi.mock("@/lib/email", () => ({ sendInvitationEmail: async () => undefined }));
vi.mock("@/lib/audit-log", () => ({ createAuditLog: async () => undefined }));
vi.mock("@/lib/auth/role-assignment", () => ({ checkRoleAssignment: async () => null }));
vi.mock("@/lib/hr/generate-employee-id", () => ({ generateNextEmployeeId: async () => "E1" }));
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: { findFirst: (...a: unknown[]) => findUser(...a) },
      invitations: { findFirst: (...a: unknown[]) => findInvitation(...a) },
      organizationMembers: { findFirst: (...a: unknown[]) => findMember(...a) },
      organizations: { findFirst: async () => ({ name: "Miyo", allowedEmailDomains: [] }) },
    },
    delete: () => ({ where: () => ({ returning: async () => { deleted(); return [{ id: "inv1" }]; } }) }),
    insert: (...a: unknown[]) => { insert(...a); return { values: async () => undefined }; },
    transaction: (...a: unknown[]) => transaction(...a),
  },
}));

const req = (url: string, body?: unknown) =>
  new NextRequest(url, body === undefined ? undefined : {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });

const invitation = { id: "inv1", email: "edge1@maxxspace.com", orgId: "o1", role: "EMPLOYEE", expiresAt: new Date(Date.now() + 60_000) };

beforeEach(() => vi.clearAllMocks());

describe("stale invitation after the wizard created the account (R3-ONB-07)", () => {
  it("accept returns 409 with a friendly message, revokes the link and creates no user", async () => {
    const { POST } = await import("@/app/api/auth/accept-invitation/route");
    findInvitation.mockResolvedValue(invitation);
    findUser.mockResolvedValue({ id: "u1" });
    const res = await POST(req("http://localhost/api/auth/accept-invitation", { token: "t", password: "Tangerine#2026" }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/already exists/);
    expect(deleted).toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it("the invitation page no longer offers Join Organization", async () => {
    const { GET } = await import("@/app/api/auth/invitation/route");
    findInvitation.mockResolvedValue(invitation);
    findUser.mockResolvedValue({ id: "u1" });
    const res = await GET(req("http://localhost/api/auth/invitation?token=t"));
    expect(res.status).toBe(409);
  });

  it("accept rejects a password containing the invitee's email (R3-SET-01)", async () => {
    const { POST } = await import("@/app/api/auth/accept-invitation/route");
    findInvitation.mockResolvedValue(invitation);
    findUser.mockResolvedValue(undefined);
    const res = await POST(req("http://localhost/api/auth/accept-invitation", { token: "t", password: "Edge1@maxxspace.com#X" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Password must not contain your email or name");
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("invitation page details (R3-ACC-03)", () => {
  it("names the inviter and the role", async () => {
    const { GET } = await import("@/app/api/auth/invitation/route");
    findInvitation.mockResolvedValue({ ...invitation, role: "ADMIN", invitedBy: "admin1" });
    findUser.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ firstName: "Asha", lastName: "Rao", name: "asha" });
    const res = await GET(req("http://localhost/api/auth/invitation?token=t"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ organizationName: "Miyo", role: "ADMIN", inviterName: "Asha Rao" });
  });
});

describe("createOrgInvitation identity + email rules (R3-ONB-07, R3-INV-10)", () => {
  const base = { orgId: "o1", role: "EMPLOYEE", invitedBy: "admin", actorRole: "ADMIN" };

  it("refuses an address that already has an account, member or not", async () => {
    const { createOrgInvitation } = await import("@/lib/org/create-invitation");
    findUser.mockResolvedValue({ id: "u1" });
    findMember.mockResolvedValue(undefined);
    const res = await createOrgInvitation({ ...base, email: "Edge1@MaxxSpace.com" });
    expect(res).toMatchObject({ ok: false, status: 409 });
    expect(insert).not.toHaveBeenCalled();
  });

  it("refuses 'a@b' and a 257-character address server-side", async () => {
    const { createOrgInvitation } = await import("@/lib/org/create-invitation");
    for (const email of ["a@b", `${"a".repeat(245)}@example.com`]) {
      const res = await createOrgInvitation({ ...base, email });
      expect(res).toMatchObject({ ok: false, status: 400 });
    }
    expect(findUser).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("still invites a new address", async () => {
    const { createOrgInvitation } = await import("@/lib/org/create-invitation");
    findUser.mockResolvedValue(undefined);
    findInvitation.mockResolvedValue(undefined);
    const res = await createOrgInvitation({ ...base, email: "new.person@maxxspace.com" });
    expect(res.ok).toBe(true);
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
