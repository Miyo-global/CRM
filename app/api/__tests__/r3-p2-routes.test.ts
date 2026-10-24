import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * R3 P2 route guards: GET /api/hr/assets needs hr:assets:view, and the team
 * leave list answers a plain employee with an empty list instead of a 403
 * (R3-EMP-07).
 */
const authMock = vi.fn();
const getAssets = vi.fn(async () => [{ id: 1 }]);

vi.mock("server-only", () => ({}));
vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/server/queries/hr/assets", () => ({ getAssets: () => getAssets() }));
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: { findFirst: async () => undefined },
      roles: { findFirst: async () => undefined },
      userPermissions: { findMany: async () => [] },
      rolePermissions: { findMany: async () => [] },
      leaveRequests: { findFirst: async () => undefined },
      organizationMembers: { findFirst: async () => ({ orgId: "org1", role: "EMPLOYEE" }) },
    },
  },
}));

function signIn(role: string) {
  authMock.mockResolvedValue({ user: { id: "actor", role, isActive: true }, orgId: "org1" });
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/hr/assets requires hr:assets:view", () => {
  it("EMPLOYEE gets 403 and no asset list", async () => {
    signIn("EMPLOYEE");
    const { GET } = await import("@/app/api/hr/assets/route");
    expect((await GET()).status).toBe(403);
    expect(getAssets).not.toHaveBeenCalled();
  });

  it.each(["HR", "ADMIN", "CEO"])("%s gets the list", async (role) => {
    signIn(role);
    const { GET } = await import("@/app/api/hr/assets/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(getAssets).toHaveBeenCalled();
  });
});

describe("GET /api/hr/leaves/team for a non-manager (R3-EMP-07)", () => {
  it("returns empty lists, not 403", async () => {
    signIn("EMPLOYEE");
    const { NextRequest } = await import("next/server");
    const { GET } = await import("@/app/api/hr/leaves/team/route");
    const res = await GET(new NextRequest("http://localhost/api/hr/leaves/team"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(JSON.stringify(body)).toContain('"pending":[]');
  });
});
