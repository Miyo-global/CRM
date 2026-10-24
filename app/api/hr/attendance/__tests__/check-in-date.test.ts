import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.fn();
const inserted = vi.fn();

function chain(result: () => unknown) {
  const proxy: unknown = new Proxy({}, {
    get(_t, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
          Promise.resolve().then(result).then(resolve, reject);
      }
      return () => proxy;
    },
  });
  return proxy;
}

vi.mock("server-only", () => ({}));
vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/rbac/middleware", () => ({ checkPermission: async () => true }));
vi.mock("@/lib/hr/attendance-hr-notifications", () => ({ notifyHrEmployeeCheckIn: vi.fn() }));
vi.mock("@/lib/hr/late-arrival-after-check-in", () => ({
  getLateCutoffMinutesIst: () => 24 * 60,
  minutesSinceMidnightIst: () => 0,
  handleLateArrivalAfterCheckIn: vi.fn(async () => undefined),
}));
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: { findFirst: async () => ({ joiningDate: "2020-01-01" }) },
      holidays: { findFirst: async () => undefined },
    },
    transaction: async (fn: (tx: unknown) => unknown) =>
      fn({
        select: () => chain(() => []),
        update: () => chain(() => undefined),
        insert: () => ({
          values: (v: Record<string, unknown>) => {
            inserted(v);
            return { returning: async () => [{ id: 1 }] };
          },
        }),
      }),
  },
}));

const { POST } = await import("@/app/api/hr/attendance/check-in/route");

// R3-EMP-01: the row must be written under the same date key the status
// query reads (org-timezone today), whatever date the browser sends.
describe("check-in date key (R3-EMP-01)", () => {
  const originalTz = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = "America/New_York";
    vi.useFakeTimers({ toFake: ["Date"] });
    // Fri 23 Oct 15:55 New York = Sat 24 Oct 01:25 IST.
    vi.setSystemTime(new Date("2026-10-23T19:55:00Z"));
  });
  afterAll(() => {
    vi.useRealTimers();
    process.env.TZ = originalTz;
  });
  beforeEach(() => {
    inserted.mockClear();
    authMock.mockResolvedValue({ user: { id: "u1", role: "EMPLOYEE", isActive: true }, orgId: "org1" });
  });

  it.each([[{}], [{ localDate: "2026-10-23" }]])("dates the punch 2026-10-24 for body %j", async (body) => {
    const res = await POST(
      new NextRequest("http://localhost/api/hr/attendance/check-in", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).toBe(200);
    expect(inserted).toHaveBeenCalledWith(expect.objectContaining({ date: "2026-10-24" }));
  });
});
