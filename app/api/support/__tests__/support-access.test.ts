import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.fn();
const getTickets = vi.fn(async (..._a: unknown[]) => ({ items: [], total: 0, page: 1, totalPages: 0 }));
const getStats = vi.fn(async (..._a: unknown[]) => ({}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/email", () => ({}));
vi.mock("@/server/actions/create-notification", () => ({ notifyByRoles: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      userSessions: { findFirst: vi.fn(async () => null) },
      organizationMembers: { findFirst: vi.fn(async () => ({ orgId: "org1" })) },
    },
  },
}));
vi.mock("@/server/queries/support-dashboard", () => ({ getSupportDashboard: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/server/queries/support", () => ({
  getSupportTickets: (...a: unknown[]) => getTickets(...a),
  getSupportTicketStats: (...a: unknown[]) => getStats(...a),
  logSupportActivity: vi.fn(),
}));

function signIn(role: string) {
  authMock.mockResolvedValue({ user: { id: "self", role, isActive: true }, orgId: "org1" });
}

beforeEach(() => {
  authMock.mockReset();
  getTickets.mockClear();
  getStats.mockClear();
});

describe("support analytics (AUTH-03)", () => {
  it.each(["ENGINEERING", "SALES", "DESIGN"])("forbids %s", async (role) => {
    signIn(role);
    const { GET } = await import("@/app/api/crm/support-dashboard/route");
    expect((await GET()).status).toBe(403);
  });

  it.each(["CEO", "ADMIN", "HR", "CUSTOMER_SUPPORT"])("allows %s", async (role) => {
    signIn(role);
    const { GET } = await import("@/app/api/crm/support-dashboard/route");
    expect((await GET()).status).toBe(200);
  });
});

describe("support ticket list scope", () => {
  it("limits an employee to their own tickets", async () => {
    signIn("ENGINEERING");
    const { GET } = await import("@/app/api/support/route");
    await GET(new NextRequest("http://localhost/api/support"));
    expect(getTickets.mock.calls[0][1]).toMatchObject({ viewerId: "self" });

    const stats = await import("@/app/api/support/stats/route");
    await stats.GET();
    expect(getStats).toHaveBeenCalledWith("org1", "self");
  });

  it("shows support staff every ticket", async () => {
    signIn("CUSTOMER_SUPPORT");
    const { GET } = await import("@/app/api/support/route");
    await GET(new NextRequest("http://localhost/api/support"));
    expect(getTickets.mock.calls[0][1]).toMatchObject({ viewerId: undefined });
  });
});
