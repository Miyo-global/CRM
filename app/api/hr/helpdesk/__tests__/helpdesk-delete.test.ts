import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.fn();
const deletedRows = vi.fn(async (): Promise<{ id: number }[]> => [{ id: 9 }]);
const deleteCalls: unknown[] = [];

vi.mock("server-only", () => ({}));
vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/db", () => {
  const tx = {
    delete: (table: unknown) => {
      deleteCalls.push(table);
      return { where: () => ({ returning: () => deletedRows(), then: (r: (v: unknown) => void) => r(undefined) }) };
    },
  };
  return {
    db: {
      transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
      query: {
        userSessions: { findFirst: vi.fn(async () => null) },
        organizationMembers: { findFirst: vi.fn(async () => ({ orgId: "org1" })) },
      },
    },
  };
});

function signIn(role: string) {
  authMock.mockResolvedValue({ user: { id: "self", role, isActive: true }, orgId: "org1" });
}

const call = async (id: string) => {
  const { DELETE } = await import("@/app/api/hr/helpdesk/[ticketId]/route");
  return DELETE(new NextRequest(`http://localhost/api/hr/helpdesk/${id}`, { method: "DELETE" }), {
    params: Promise.resolve({ ticketId: id }),
  });
};

beforeEach(() => {
  authMock.mockReset();
  deleteCalls.length = 0;
});

describe("helpdesk ticket delete (BUG-35)", () => {
  it.each(["ENGINEERING", "CUSTOMER_SUPPORT"])("forbids %s", async (role) => {
    signIn(role);
    expect((await call("9")).status).toBe(403);
    expect(deleteCalls).toHaveLength(0);
  });

  it("lets an admin delete the comments and the ticket", async () => {
    signIn("ADMIN");
    expect((await call("9")).status).toBe(200);
    expect(deleteCalls).toHaveLength(2);
  });

  it("404s an unknown ticket", async () => {
    signIn("HR");
    deletedRows.mockResolvedValueOnce([]);
    expect((await call("404")).status).toBe(404);
  });
});
