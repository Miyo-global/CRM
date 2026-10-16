import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const authMock = vi.fn();
const sessionRow = vi.fn();
const memory = new Map<string, unknown>();

vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/redis", () => ({
  redis: {
    get: async (k: string) => memory.get(k) ?? null,
    set: async (k: string, v: unknown) => { memory.set(k, v); return "OK"; },
  },
}));
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      userSessions: { findFirst: () => sessionRow() },
      organizationMembers: { findFirst: async () => null },
    },
  },
}));

const { withAuth, withRoles, serverError, userErrorOr500 } = await import("./helpers");
const handler = async () => NextResponse.json({ ok: true });

function signIn(extra: Record<string, unknown> = {}) {
  authMock.mockResolvedValue({ user: { id: "u1", role: "ENGINEERING", isActive: true }, orgId: "org1", sessionId: "s1", ...extra });
}

beforeEach(() => {
  memory.clear();
  authMock.mockReset();
  sessionRow.mockReset();
  sessionRow.mockResolvedValue({ isRevoked: false, userId: "u1" });
});

describe("withAuth session revocation", () => {
  it("rejects a session revoked in Postgres even when the local cache has no marker", async () => {
    signIn();
    sessionRow.mockResolvedValue({ isRevoked: true, userId: "u1" });
    expect((await withAuth(handler)).status).toBe(401);
  });

  it("rejects a session row that belongs to another user", async () => {
    signIn();
    sessionRow.mockResolvedValue({ isRevoked: false, userId: "someone-else" });
    expect((await withAuth(handler)).status).toBe(401);
  });

  it("rejects a session marked revoked in the local cache without hitting Postgres", async () => {
    signIn();
    memory.set("revoked:session:s1", true);
    expect((await withAuth(handler)).status).toBe(401);
    expect(sessionRow).not.toHaveBeenCalled();
  });

  it("fails closed when Postgres is unavailable", async () => {
    signIn();
    sessionRow.mockRejectedValue(new Error("db down"));
    expect((await withAuth(handler)).status).toBe(503);
  });

  it("rejects anonymous and deactivated users", async () => {
    authMock.mockResolvedValue(null);
    expect((await withAuth(handler)).status).toBe(401);
    signIn({ user: { id: "u1", role: "ENGINEERING", isActive: false } });
    expect((await withAuth(handler)).status).toBe(403);
  });

  it("allows a live session", async () => {
    signIn();
    expect((await withAuth(handler)).status).toBe(200);
    expect(sessionRow).toHaveBeenCalledTimes(1);
  });
});

describe("withRoles", () => {
  it("forbids roles outside the allow list", async () => {
    signIn();
    expect((await withRoles(["CEO"])(handler)).status).toBe(403);
  });

  it("allows listed roles", async () => {
    signIn({ user: { id: "u1", role: "CEO", isActive: true } });
    expect((await withRoles(["CEO"])(handler)).status).toBe(200);
  });
});

describe("serverError", () => {
  it("never returns the underlying error text", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = serverError(new Error('Failed query: select * from "projects" where org_id = $1 params: org_abc'), { route: "t", orgId: "org_abc" });
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toBe("Something went wrong. Please try again.");
    expect(body.errorId).toMatch(/^[0-9a-f]{8}$/);
    expect(JSON.stringify(body)).not.toMatch(/select|org_abc/i);
    expect(spy.mock.calls[0][0]).toContain(body.errorId);
    spy.mockRestore();
  });
});

describe("withAuth Server-Timing", () => {
  it("adds auth, session-check, membership and handler timings", async () => {
    signIn();
    sessionRow.mockResolvedValue({ isRevoked: false, userId: "u1" });
    const res = await withAuth(handler);
    const header = res.headers.get("Server-Timing") ?? "";
    for (const name of ["auth", "session-check", "membership", "handler"]) {
      expect(header).toMatch(new RegExp(`${name};dur=\\d`));
    }
  });
});

describe("withAuth revocation cache (MIYO-0011)", () => {
  it("checks userSessions once per session within the TTL", async () => {
    signIn();
    sessionRow.mockReset();
    sessionRow.mockResolvedValue({ isRevoked: false, userId: "u1" });
    expect((await withAuth(handler)).status).toBe(200);
    expect((await withAuth(handler)).status).toBe(200);
    expect(sessionRow).toHaveBeenCalledTimes(1);
  });

  it("a same-instance revocation still applies immediately", async () => {
    signIn();
    sessionRow.mockResolvedValue({ isRevoked: false, userId: "u1" });
    await withAuth(handler);
    memory.set("revoked:session:s1", true);
    expect((await withAuth(handler)).status).toBe(401);
  });
});

describe("userErrorOr500", () => {
  it("keeps plain business messages as 400 and hides DB errors", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const biz = userErrorOr500(new Error("Already checked in"), { route: "t" });
    expect(biz.status).toBe(400);
    expect((await biz.json()).error).toBe("Already checked in");

    class DrizzleQueryError extends Error {}
    const db = userErrorOr500(new DrizzleQueryError("Failed query: select 1"), { route: "t" }, "Check-in failed.");
    expect(db.status).toBe(500);
    expect((await db.json()).error).toBe("Check-in failed.");

    const wrapped = userErrorOr500(new Error('column "x" does not exist'), { route: "t" });
    expect(wrapped.status).toBe(500);
    spy.mockRestore();
  });
});
