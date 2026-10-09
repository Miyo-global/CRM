import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const authMock = vi.fn();
const sessionRow = vi.fn();
const memory = new Map<string, unknown>();

vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/redis", () => ({
  redis: { get: async (k: string) => memory.get(k) ?? null },
}));
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      userSessions: { findFirst: () => sessionRow() },
      organizationMembers: { findFirst: async () => null },
    },
  },
}));

const { withAuth, withRoles } = await import("./helpers");
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
