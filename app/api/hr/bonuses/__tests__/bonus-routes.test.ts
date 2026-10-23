import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.fn();
const findDuplicate = vi.fn(async (): Promise<{ id: number } | undefined> => undefined);
const existingBonus = vi.fn(async () => [{ id: 7, userId: "emp1", status: "PENDING", type: "SPOT", amount: "100", reason: null }]);
const inserted = vi.fn();
const updated = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/hr/send-bonus-paid-notifications", () => ({ deliverBonusPaidNotifications: async () => ({}) }));
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => existingBonus() }) }),
    insert: () => ({ values: (v: unknown) => ({ returning: async () => { inserted(v); return [v]; } }) }),
    update: () => ({ set: (v: unknown) => ({ where: () => ({ returning: async () => { updated(v); return [v]; } }) }) }),
    query: {
      userSessions: { findFirst: vi.fn(async () => null) },
      organizationMembers: { findFirst: vi.fn(async () => ({ orgId: "org1" })) },
      bonuses: { findFirst: () => findDuplicate() },
    },
  },
}));

const json = (body: unknown) => ({ method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  authMock.mockResolvedValue({ user: { id: "hr1", role: "HR", isActive: true }, orgId: "org1" });
  inserted.mockReset();
  updated.mockReset();
});

describe("bonus duplicate guard (R2-HR-06)", () => {
  const post = async () => {
    const { POST } = await import("@/app/api/hr/bonuses/route");
    return POST(new NextRequest("http://localhost/api/hr/bonuses", json({ userId: "emp1", type: "SPOT", amount: 100 })));
  };

  it("creates a first bonus", async () => {
    expect((await post()).status).toBe(201);
    expect(inserted).toHaveBeenCalledOnce();
  });

  it("refuses an identical open bonus", async () => {
    findDuplicate.mockResolvedValueOnce({ id: 3 });
    expect((await post()).status).toBe(409);
    expect(inserted).not.toHaveBeenCalled();
  });
});

describe("bonus status (R2-CRUD-05)", () => {
  const patch = async (body: unknown) => {
    const { PATCH } = await import("@/app/api/hr/bonuses/[bonusId]/route");
    return PATCH(new NextRequest("http://localhost/api/hr/bonuses/7", { method: "PATCH", body: JSON.stringify(body) }), {
      params: Promise.resolve({ bonusId: "7" }),
    });
  };

  it("will not pay a pending bonus", async () => {
    const res = await patch({ status: "PAID" });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe("Approve the bonus before marking it paid.");
    expect(updated).not.toHaveBeenCalled();
  });

  it("approves a pending bonus, and edits it while pending", async () => {
    expect((await patch({ status: "APPROVED" })).status).toBe(200);
    expect(updated).toHaveBeenLastCalledWith(expect.objectContaining({ status: "APPROVED", approvedBy: "hr1" }));
    expect((await patch({ amount: 250, reason: "Q4 target" })).status).toBe(200);
    expect(updated).toHaveBeenLastCalledWith({ type: "SPOT", amount: "250", reason: "Q4 target" });
  });

  it("will not edit an approved bonus", async () => {
    existingBonus.mockResolvedValueOnce([{ id: 7, userId: "emp1", status: "APPROVED", type: "SPOT", amount: "100", reason: null }]);
    expect((await patch({ amount: 250 })).status).toBe(400);
    expect(updated).not.toHaveBeenCalled();
  });
});
