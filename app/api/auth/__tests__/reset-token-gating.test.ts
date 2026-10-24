import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const findUser = vi.fn();
const findToken = vi.fn();
const insert = vi.fn();
const transaction = vi.fn();
const sendReset = vi.fn(async () => undefined);

vi.mock("server-only", () => ({}));
vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/auth", () => ({ auth: async () => null, revokeAllUserSessions: async () => undefined }));
vi.mock("@/lib/email", () => ({
  sendPasswordResetEmail: (...a: unknown[]) => sendReset(...(a as [])),
  sendPasswordChangeConfirmationEmail: async () => undefined,
}));
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: { findFirst: (...a: unknown[]) => findUser(...a) },
      passwordResetTokens: { findFirst: (...a: unknown[]) => findToken(...a) },
    },
    insert: (...a: unknown[]) => {
      insert(...a);
      return { values: async () => undefined };
    },
    delete: () => ({ where: async () => undefined }),
    transaction: (...a: unknown[]) => transaction(...a),
  },
}));

const post = (body: unknown) =>
  new NextRequest("http://localhost/x", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });

beforeEach(() => vi.clearAllMocks());

describe("forgot-password (R3-SA-11)", () => {
  const load = () => import("@/app/api/auth/forgot-password/route");

  it("creates no reset token for a terminated account and answers exactly like an unknown address", async () => {
    const { POST } = await load();

    findUser.mockResolvedValue(undefined);
    const unknown = await POST(post({ email: "nobody@example.com" }));

    findUser.mockResolvedValue({ id: "u1", email: "gone@example.com", isActive: false, role: "EMPLOYEE", hasDashboardAccess: false });
    const terminated = await POST(post({ email: "gone@example.com" }));

    expect(terminated.status).toBe(unknown.status);
    expect(await terminated.json()).toEqual(await unknown.json());
    expect(insert).not.toHaveBeenCalled();
    expect(sendReset).not.toHaveBeenCalled();
  });

  it("still issues a token for an active account", async () => {
    const { POST } = await load();
    findUser.mockResolvedValue({ id: "u2", email: "here@example.com", isActive: true, role: "EMPLOYEE", hasDashboardAccess: true });
    const res = await POST(post({ email: "here@example.com" }));
    expect(res.status).toBe(200);
    expect(insert).toHaveBeenCalledTimes(1);
  });
});

describe("reset-password (R3-SA-11)", () => {
  const load = () => import("@/app/api/auth/reset-password/route");

  it("refuses a link issued before the account was terminated", async () => {
    const { POST } = await load();
    findToken.mockResolvedValue({ email: "gone@example.com", token: "h", expiresAt: new Date(Date.now() + 60_000) });
    findUser.mockResolvedValue({ isActive: false });
    const res = await POST(post({ token: "t", password: "Str0ng!Passw0rd#" }));
    expect(res.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });
});
