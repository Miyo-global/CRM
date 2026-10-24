import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.fn();
const inserted = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/hr/fnf-eligible", () => ({
  // u-resigned has resignation 42; u-terminated a termination; nobody else.
  fnfEligibleUsers: async () => new Map<string, number | null>([["u-resigned", 42], ["u-terminated", null]]),
}));
vi.mock("@/lib/db", () => ({
  db: {
    insert: () => ({
      values: (v: unknown) => {
        inserted(v);
        return { returning: async () => [{ id: 1, ...(v as object) }] };
      },
    }),
  },
}));

const { POST } = await import("@/app/api/hr/fnf/route");

const post = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/hr/fnf", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  );

describe("FnF create: only people with a resignation or termination", () => {
  beforeEach(() => {
    inserted.mockClear();
    authMock.mockResolvedValue({ user: { id: "hr1", role: "HR", isActive: true }, orgId: "org1" });
  });

  it("rejects someone with no exit (or from another org)", async () => {
    const res = await post({ userId: "u-active" });
    expect(res.status).toBe(400);
    expect(inserted).not.toHaveBeenCalled();
  });

  it("links the resignation for a resigned employee", async () => {
    const res = await post({ userId: "u-resigned", basicDues: 100 });
    expect(res.status).toBe(201);
    expect(inserted).toHaveBeenCalledWith(expect.objectContaining({ userId: "u-resigned", resignationId: 42 }));
  });

  it("accepts a terminated employee with no resignation", async () => {
    const res = await post({ userId: "u-terminated" });
    expect(res.status).toBe(201);
    expect(inserted).toHaveBeenCalledWith(expect.objectContaining({ resignationId: null }));
  });
});
