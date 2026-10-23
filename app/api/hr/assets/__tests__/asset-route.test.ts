import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { assets, assetAssignmentHistory, assetReturns } from "@/lib/db/schema";

const authMock = vi.fn();
const findAsset = vi.fn(async (): Promise<Record<string, unknown> | undefined> => ({ id: 5 }));
const calls: { op: string; table: unknown }[] = [];

vi.mock("server-only", () => ({}));
vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/server/queries/hr/assets", () => ({ countAssetAssignments: async () => 1 }));
vi.mock("@/lib/db", () => {
  const tx = {
    delete: (table: unknown) => {
      calls.push({ op: "delete", table });
      return { where: async () => undefined };
    },
    update: (table: unknown) => {
      calls.push({ op: "update", table });
      return { set: () => ({ where: async () => undefined }) };
    },
  };
  return {
    db: {
      update: tx.update,
      transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
      query: {
        userSessions: { findFirst: vi.fn(async () => null) },
        organizationMembers: { findFirst: vi.fn(async () => ({ orgId: "org1" })) },
        assets: { findFirst: () => findAsset() },
      },
    },
  };
});

function signIn(role: string) {
  authMock.mockResolvedValue({ user: { id: "self", role, isActive: true }, orgId: "org1" });
}

const call = async (id: string) => {
  const { DELETE } = await import("@/app/api/hr/assets/[assetId]/route");
  return DELETE(new NextRequest(`http://localhost/api/hr/assets/${id}`, { method: "DELETE" }), {
    params: Promise.resolve({ assetId: id }),
  });
};

beforeEach(() => {
  authMock.mockReset();
  calls.length = 0;
});

const patch = async (id: string, body: unknown) => {
  const { PATCH } = await import("@/app/api/hr/assets/[assetId]/route");
  return PATCH(
    new NextRequest(`http://localhost/api/hr/assets/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    { params: Promise.resolve({ assetId: id }) },
  );
};

describe("return to inventory (R2-CRUD-02)", () => {
  // A legacy row: no purchase date or cost, so a whole-record check fails it.
  const assigned = { assignedTo: "emp1", name: "Laptop", type: "Laptop", serialNumber: "SN-0001", brand: "Dell", model: "X1", status: "ASSIGNED", purchaseDate: null, purchaseCost: null, location: null, notes: null };

  it("returns an assigned asset with only status and assignee", async () => {
    signIn("ADMIN");
    findAsset.mockResolvedValueOnce(assigned);
    const res = await patch("5", { status: "AVAILABLE", assignedTo: "" });
    expect(res.status).toBe(200);
    expect(calls).toEqual([{ op: "update", table: assets }]);
  });

  it("checks a field edit against the stored record, in plain words", async () => {
    signIn("ADMIN");
    findAsset.mockResolvedValueOnce(assigned);
    const res = await patch("5", { name: "Laptop Pro" });
    expect(res.status).toBe(400);
    const { error } = (await res.json()) as { error: string };
    expect(error).toBe("Purchase date is required");
  });
});

describe("asset delete (R2-CRUD-01)", () => {
  it("clears the asset's history and unlinks its returns before deleting it", async () => {
    signIn("ADMIN");
    expect((await call("5")).status).toBe(200);
    expect(calls).toEqual([
      { op: "delete", table: assetAssignmentHistory },
      { op: "update", table: assetReturns },
      { op: "delete", table: assets },
    ]);
  });

  it("forbids non-admins", async () => {
    signIn("ENGINEERING");
    expect((await call("5")).status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  it("404s an unknown asset", async () => {
    signIn("ADMIN");
    findAsset.mockResolvedValueOnce(undefined);
    expect((await call("404")).status).toBe(404);
    expect(calls).toHaveLength(0);
  });
});
