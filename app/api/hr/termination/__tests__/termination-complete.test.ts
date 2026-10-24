import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.fn();
const findTermination = vi.fn();
const deactivate = vi.fn(async () => ({ sessionIds: ["s1"] }));
const after = vi.fn(async () => undefined);

function chain() {
  const proxy: unknown = new Proxy({}, { get: (_t, prop) => (prop === "then" ? undefined : () => proxy) });
  return proxy;
}

vi.mock("server-only", () => ({}));
vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/db/audit", () => ({ writeAuditLog: () => Promise.resolve() }));
vi.mock("@/lib/hr-cache", () => ({ invalidateHrDashboardCache: async () => undefined }));
vi.mock("@/lib/date-utils", async (orig) => ({ ...(await orig<object>()), getTodayString: () => "2026-10-24" }));
vi.mock("@/lib/hr/deactivate-account", () => ({
  deactivateAccountsInTx: (...a: unknown[]) => deactivate(...(a as [])),
  afterAccountsDeactivated: (...a: unknown[]) => after(...(a as [])),
}));
vi.mock("@/lib/db", () => {
  const tx = {
    update: () => chain(),
    insert: () => chain(),
    query: {
      fnfSettlements: { findFirst: async () => null },
      assetReturns: { findMany: async () => [] },
    },
  };
  return {
    db: {
      query: {
        terminations: { findFirst: (...a: unknown[]) => findTermination(...a) },
        assets: { findMany: async () => [] },
      },
      transaction: async (cb: (t: typeof tx) => unknown) => cb(tx),
    },
  };
});

const params = { params: Promise.resolve({ terminationId: "7" }) };
const req = new NextRequest("http://localhost/x", { method: "PATCH" });
const load = () => import("@/app/api/hr/termination/[terminationId]/complete/route");

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: "admin", role: "CEO", isActive: true }, orgId: "org1" });
});

describe("Complete termination (R3-SA-01, R3-SA-09)", () => {
  it("closes the account in the completing transaction when the effective date has come", async () => {
    findTermination.mockResolvedValue({ id: 7, userId: "emp", status: "SENT", effectiveDate: "2026-10-23" });
    const { PATCH } = await load();
    const res = await PATCH(req, params);
    expect(res.status).toBe(200);
    expect(deactivate).toHaveBeenCalledWith(expect.anything(), ["emp"]);
    expect(after).toHaveBeenCalledWith(["emp"], ["s1"]);
    expect(await res.json()).toMatchObject({ deactivated: true });
  });

  it("leaves a future-dated termination's account open for the daily job", async () => {
    findTermination.mockResolvedValue({ id: 7, userId: "emp", status: "SENT", effectiveDate: "2026-12-22" });
    const { PATCH } = await load();
    const res = await PATCH(req, params);
    expect(res.status).toBe(200);
    expect(deactivate).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
    expect(await res.json()).toMatchObject({ deactivated: false, effectiveDate: "2026-12-22" });
  });
});
