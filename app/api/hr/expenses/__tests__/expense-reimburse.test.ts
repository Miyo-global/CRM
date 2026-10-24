import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.fn();
const expenseRow = { id: 4, userId: "emp1", status: "APPROVED", category: "Travel", amount: "500", description: null, receiptUrl: null, approverId: "hr1", approvedAt: new Date() };
let current: typeof expenseRow | undefined;
const updates: unknown[] = [];
const reimbursementUpserts: unknown[] = [];

vi.mock("server-only", () => ({}));
vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/audit-log", () => ({ createAuditLog: async () => undefined }));
vi.mock("@/lib/email", () => ({
  sendExpenseApprovedEmail: async () => undefined,
  sendExpenseRejectedEmail: async () => undefined,
  sendExpensePaidEmail: async () => undefined,
}));

const tx = {
  select: () => ({ from: () => ({ where: () => ({ for: async () => (current ? [current] : []) }) }) }),
  update: () => ({ set: (v: unknown) => ({ where: async () => { updates.push(v); } }) }),
  insert: () => ({
    values: (v: unknown) => ({
      onConflictDoUpdate: async (c: unknown) => { reimbursementUpserts.push({ v, c }); },
      onConflictDoNothing: async () => undefined,
    }),
  }),
};

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({ from: () => ({ innerJoin: () => ({ where: () => ({ limit: async () => (current ? [{ id: "emp1", role: "EMPLOYEE", filedBy: null }] : []) }) }) }) }),
    transaction: async (cb: (t: typeof tx) => unknown) => cb(tx),
    query: {
      userSessions: { findFirst: vi.fn(async () => null) },
      organizationMembers: { findFirst: vi.fn(async () => ({ orgId: "org1", userId: "hr1" })) },
      expenses: { findFirst: vi.fn(async () => undefined) },
      users: { findFirst: vi.fn(async () => undefined) },
    },
  },
}));

const patch = async (body: unknown) => {
  const { PATCH } = await import("@/app/api/hr/expenses/[expenseId]/route");
  return PATCH(
    new NextRequest("http://localhost/api/hr/expenses/4", { method: "PATCH", body: JSON.stringify(body) }),
    { params: Promise.resolve({ expenseId: "4" }) },
  );
};

beforeEach(() => {
  authMock.mockResolvedValue({ user: { id: "hr1", role: "HR", name: "HR", isActive: true }, orgId: "org1" });
  current = { ...expenseRow };
  updates.length = 0;
  reimbursementUpserts.length = 0;
});

describe("PATCH /api/hr/expenses/:id mark reimbursed (R3-HR-01)", () => {
  it("pays an approved claim and marks its reimbursement paid", async () => {
    const res = await patch({ status: "PAID" });
    expect(res.status).toBe(200);
    expect(updates[0]).toMatchObject({ status: "PAID", paidAt: expect.any(Date) });
    // The approver of record is kept, not overwritten by whoever paid.
    expect(updates[0]).not.toHaveProperty("approverId");
    expect(reimbursementUpserts[0]).toMatchObject({ v: { expenseId: 4, userId: "emp1", status: "PAID" } });
  });

  it("accepts REIMBURSED as the same thing", async () => {
    expect((await patch({ status: "REIMBURSED" })).status).toBe(200);
  });

  it("answers 409 with a message, not 500, for a claim already paid", async () => {
    current = { ...expenseRow, status: "PAID" };
    const res = await patch({ status: "PAID" });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/already been reimbursed/);
    expect(updates).toHaveLength(0);
  });

  it("answers 400 with field errors for an unknown status", async () => {
    const res = await patch({ status: "DONE" });
    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors.status[0]).toMatch(/Reimbursed/);
  });

  it("answers 404 when the claim is not in this org", async () => {
    current = undefined;
    expect((await patch({ status: "PAID" })).status).toBe(404);
  });
});
