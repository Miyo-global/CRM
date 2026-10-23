import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.fn();
const inserted = vi.fn();
const resolveApprover = vi.fn(async () => ({ approverId: "boss" as string | null, autoApprove: false }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/audit-log", () => ({ createAuditLog: async () => undefined }));
vi.mock("@/lib/email", () => ({ sendExpenseSubmittedEmail: async () => undefined }));
vi.mock("@/lib/hr/leave-approvals-server", () => ({ resolveLeaveApprover: () => resolveApprover() }));
vi.mock("@/lib/db", () => ({
  db: {
    insert: () => ({ values: (v: unknown) => ({ returning: async () => { inserted(v); return [{ id: 1, ...(v as object) }]; } }) }),
    select: () => ({ from: () => ({ innerJoin: () => ({ where: async () => [] }) }) }),
    query: {
      userSessions: { findFirst: vi.fn(async () => null) },
      organizationMembers: { findFirst: vi.fn(async () => ({ orgId: "org1", userId: "emp1" })) },
      expenses: { findFirst: vi.fn(async () => undefined) },
      users: { findFirst: vi.fn(async () => ({ id: "emp1", name: "Emp", role: "ENGINEERING", reportingTo: null })) },
    },
  },
}));

const claim = { category: "Travel", amount: 10, paymentMethod: "Cash", expenseDate: "2026-01-15" };

const post = async (body: unknown) => {
  const { POST } = await import("@/app/api/hr/expenses/route");
  return POST(new NextRequest("http://localhost/api/hr/expenses", { method: "POST", body: JSON.stringify(body) }));
};

const signIn = (role: string) =>
  authMock.mockResolvedValue({ user: { id: "hr1", role, name: "HR", isActive: true }, orgId: "org1" });

beforeEach(() => inserted.mockReset());

describe("expense filed for another employee (R2-CRUD-06)", () => {
  it("lets HR file a pending claim in the employee's name", async () => {
    signIn("HR");
    expect((await post({ ...claim, userId: "emp1" })).status).toBe(200);
    expect(inserted).toHaveBeenCalledWith(expect.objectContaining({ userId: "emp1", status: "PENDING", approverId: "boss" }));
  });

  it("never routes the claim back to the person who filed it", async () => {
    signIn("HR");
    resolveApprover.mockResolvedValueOnce({ approverId: "hr1", autoApprove: false });
    await post({ ...claim, userId: "emp1" });
    expect(inserted).toHaveBeenCalledWith(expect.objectContaining({ approverId: null, status: "PENDING" }));
  });

  it("does not let an employee file for someone else", async () => {
    signIn("ENGINEERING");
    expect((await post({ ...claim, userId: "emp1" })).status).toBe(403);
    expect(inserted).not.toHaveBeenCalled();
  });
});
