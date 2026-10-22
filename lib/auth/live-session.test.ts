import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const store = new Map<string, unknown>();
const findSession = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/redis", () => ({
  redis: {
    get: async (k: string) => store.get(k) ?? null,
    set: async (k: string, v: unknown) => void store.set(k, v),
  },
}));
vi.mock("@/lib/db", () => ({
  db: { query: { userSessions: { findFirst: (...a: unknown[]) => findSession(...a) } } },
}));

import { liveAuth } from "./live-session";

const session = (extra: Record<string, unknown> = {}) => ({
  user: { id: "u1", isActive: true },
  sessionId: "s1",
  ...extra,
});

beforeEach(() => {
  store.clear();
  findSession.mockReset();
});

describe("liveAuth (SEC-0007)", () => {
  it("passes a live session", async () => {
    authMock.mockResolvedValue(session());
    findSession.mockResolvedValue({ isRevoked: false, userId: "u1" });
    expect(await liveAuth()).not.toBeNull();
  });

  it("rejects a revoked session for server actions", async () => {
    authMock.mockResolvedValue(session());
    findSession.mockResolvedValue({ isRevoked: true, userId: "u1" });
    expect(await liveAuth()).toBeNull();
  });

  it("rejects a session flagged revoked in redis without a DB read", async () => {
    authMock.mockResolvedValue(session());
    store.set("revoked:session:s1", true);
    expect(await liveAuth()).toBeNull();
    expect(findSession).not.toHaveBeenCalled();
  });

  it("rejects deactivated accounts", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", isActive: false }, sessionId: "s1" });
    expect(await liveAuth()).toBeNull();
  });

  it("fails closed when the session store is unreachable", async () => {
    authMock.mockResolvedValue(session());
    findSession.mockRejectedValue(new Error("db down"));
    expect(await liveAuth()).toBeNull();
  });
});
