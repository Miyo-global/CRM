import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.fn();
const insertResult = vi.fn();

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
vi.mock("@/lib/projects/require-project-access", () => ({
  parseIdParam: (v: string) => (Number(v) > 0 ? Number(v) : null),
  requireProjectAccess: async () => ({ ok: true, projectId: 1, role: "CONTRIBUTOR" }),
}));
vi.mock("@/lib/db", () => ({
  db: {
    query: { tickets: { findFirst: async () => ({ id: 7 }) } },
    transaction: async (fn: (tx: unknown) => unknown) =>
      fn({
        select: () => chain(() => [{ total: 2 }]),
        update: () => chain(() => undefined),
        insert: () => chain(() => insertResult()),
      }),
  },
}));

const { POST } = await import("@/app/api/projects/[projectId]/tickets/[ticketId]/time-entries/route");

const post = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/projects/1/tickets/7/time-entries", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ projectId: "1", ticketId: "7" }) },
  );

// QA run: Fri 23 Oct 15:55 in a New York browser = Sat 24 Oct 01:25 IST (org tz).
describe("ticket time-entry POST (R3-PRJ-01, R3-PRJ-04)", () => {
  const originalTz = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = "America/New_York";
  });
  afterAll(() => {
    process.env.TZ = originalTz;
  });
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-23T19:55:00Z"));
    authMock.mockResolvedValue({ user: { id: "u1", role: "EMPLOYEE", isActive: true }, orgId: "org1" });
    insertResult.mockReturnValue([{ id: 1, date: "2026-10-24" }]);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts the org-timezone today and stores it unchanged", async () => {
    const res = await post({ date: "2026-10-24", hours: 2 });
    expect(res.status).toBe(201);
  });

  it("accepts the browser's (earlier) day", async () => {
    expect((await post({ date: "2026-10-23", hours: 2 })).status).toBe(201);
  });

  it("rejects a day after the org-timezone today", async () => {
    const res = await post({ date: "2026-10-25", hours: 2 });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/future/i);
  });

  it("rejects a timestamp instead of a calendar date", async () => {
    expect((await post({ date: "2026-10-23T19:55:00.000Z", hours: 2 })).status).toBe(400);
  });

  it("returns 409 with a message for a duplicate day", async () => {
    insertResult.mockImplementation(() => {
      throw Object.assign(new Error("duplicate key"), { code: "23505" });
    });
    const res = await post({ date: "2026-10-24", hours: 2 });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/already logged time for 2026-10-24/);
  });
});
