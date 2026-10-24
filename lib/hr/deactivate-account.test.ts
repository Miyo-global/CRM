import { beforeEach, describe, expect, it, vi } from "vitest";

const redisSet = vi.fn<(...a: unknown[]) => Promise<string>>(async () => "OK");
const invalidate = vi.fn<(id: string) => Promise<void>>(async () => undefined);
vi.mock("@/lib/redis", () => ({ redis: { set: (...a: unknown[]) => redisSet(...a) } }));
vi.mock("@/lib/auth", () => ({ invalidateUserSession: (id: string) => invalidate(id) }));
vi.mock("@/lib/db", () => ({ db: {} }));

import { leaveRequests, passwordResetTokens, users, userSessions } from "@/lib/db/schema";
import { afterAccountsDeactivated, deactivateAccountsInTx } from "./deactivate-account";

/** Records each write: which table, what it set, and returns canned rows. */
function fakeTx() {
  const writes: { op: string; table: unknown; values?: Record<string, unknown> }[] = [];
  const result = (rows: unknown[]) => {
    const p = Promise.resolve(rows);
    return Object.assign(p, { returning: async () => rows });
  };
  const rowsFor = (table: unknown) =>
    table === users ? [{ email: "Gone@Example.com" }] : table === userSessions ? [{ id: "s1" }, { id: "s2" }] : [];
  const tx = {
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: () => {
          writes.push({ op: "update", table, values });
          return result(rowsFor(table));
        },
      }),
    }),
    delete: (table: unknown) => ({
      where: () => {
        writes.push({ op: "delete", table });
        return result([]);
      },
    }),
  };
  return { tx, writes };
}

beforeEach(() => vi.clearAllMocks());

describe("deactivateAccountsInTx (R3-SA-01)", () => {
  it("turns the account and Portal Access off, revokes sessions, drops reset links, cancels pending leave", async () => {
    const { tx, writes } = fakeTx();
    const { sessionIds } = await deactivateAccountsInTx(tx as never, ["u1"]);

    expect(writes.find((w) => w.table === users)?.values).toMatchObject({ isActive: false, hasDashboardAccess: false });
    expect(writes.find((w) => w.table === userSessions)?.values).toEqual({ isRevoked: true });
    expect(writes.some((w) => w.op === "delete" && w.table === passwordResetTokens)).toBe(true);
    expect(writes.find((w) => w.table === leaveRequests)?.values).toEqual({ status: "CANCELLED" });
    expect(sessionIds).toEqual(["s1", "s2"]);
  });

  it("does nothing for an empty list", async () => {
    const { tx, writes } = fakeTx();
    expect(await deactivateAccountsInTx(tx as never, [])).toEqual({ sessionIds: [] });
    expect(writes).toHaveLength(0);
  });
});

describe("afterAccountsDeactivated", () => {
  it("flags each revoked session in Redis and drops the cached user so the next request sees isActive=false", async () => {
    await afterAccountsDeactivated(["u1"], ["s1", "s2"]);
    expect(redisSet).toHaveBeenCalledTimes(2);
    expect(redisSet.mock.calls.map((c) => c[0])).toEqual(["revoked:session:s1", "revoked:session:s2"]);
    expect(invalidate).toHaveBeenCalledWith("u1");
  });
});
