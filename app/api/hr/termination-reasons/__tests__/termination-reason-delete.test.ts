import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.fn();
const findReason = vi.fn();
const findUse = vi.fn();
const del = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/db/audit", () => ({ writeAuditLog: () => Promise.resolve() }));
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      terminationReasons: { findFirst: (...a: unknown[]) => findReason(...a) },
      terminations: { findFirst: (...a: unknown[]) => findUse(...a) },
    },
    delete: () => ({ where: (...a: unknown[]) => del(...a) }),
  },
}));

const params = { params: Promise.resolve({ reasonId: "15" }) };
const req = new NextRequest("http://localhost/x", { method: "DELETE" });
const load = () => import("@/app/api/hr/termination-reasons/[reasonId]/route");

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: "admin", role: "CEO", isActive: true }, orgId: "org1" });
  findReason.mockResolvedValue({ id: 15, orgId: "org1", label: "QA-TEST reason" });
});

describe("DELETE termination reason (R3-ADM-11)", () => {
  it("deletes a reason no termination used", async () => {
    findUse.mockResolvedValue(undefined);
    const res = await (await load()).DELETE(req, params);
    expect(res.status).toBe(200);
    expect(del).toHaveBeenCalledOnce();
  });

  it("refuses a reason that is on a termination (deactivate instead)", async () => {
    findUse.mockResolvedValue({ id: 3 });
    const res = await (await load()).DELETE(req, params);
    expect(res.status).toBe(409);
    expect(del).not.toHaveBeenCalled();
  });
});
