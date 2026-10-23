import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { assets, assetAssignmentHistory, assetReturns } from "@/lib/db/schema";

const authMock = vi.fn();
const findAsset = vi.fn(async (): Promise<{ id: number } | undefined> => ({ id: 5 }));
const calls: { op: string; table: unknown }[] = [];

vi.mock("server-only", () => ({}));
vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
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
