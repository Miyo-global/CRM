import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/** R3-HR-09: HR/Admin can change a ticket's priority; the creator cannot. */
const authMock = vi.fn();
const updates: Record<string, unknown>[] = [];

vi.mock("server-only", () => ({}));
vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      userSessions: { findFirst: async () => null },
      organizationMembers: { findFirst: async () => ({ orgId: "org1" }) },
      helpdeskTickets: {
        findFirst: async () => ({ id: 9, orgId: "org1", userId: "creator", assigneeId: null, status: "TODO", title: "T" }),
      },
    },
    update: () => ({
      set: (values: Record<string, unknown>) => {
        updates.push(values);
        return { where: () => ({ returning: async () => [{ id: 9, ...values }] }) };
      },
    }),
  },
}));

function signIn(id: string, role: string) {
  authMock.mockResolvedValue({ user: { id, role, isActive: true }, orgId: "org1" });
}

const patch = async (body: unknown) => {
  const { PATCH } = await import("@/app/api/hr/helpdesk/[ticketId]/route");
  return PATCH(
    new NextRequest("http://localhost/api/hr/helpdesk/9", {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ ticketId: "9" }) },
  );
};

beforeEach(() => {
  updates.length = 0;
});

describe("helpdesk ticket priority (R3-HR-09)", () => {
  it("HR sets the priority", async () => {
    signIn("hr1", "HR");
    expect((await patch({ priority: "URGENT" })).status).toBe(200);
    expect(updates[0]).toMatchObject({ priority: "URGENT" });
  });

  it("the creator cannot", async () => {
    signIn("creator", "EMPLOYEE");
    expect((await patch({ priority: "URGENT" })).status).toBe(403);
    expect(updates).toHaveLength(0);
  });

  it("rejects an unknown priority", async () => {
    signIn("hr1", "HR");
    expect((await patch({ priority: "SEVERE" })).status).toBe(400);
  });
});
