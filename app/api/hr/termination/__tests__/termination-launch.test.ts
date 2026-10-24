import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { addDaysToDateString, getTodayString } from "@/lib/date-utils";

const authMock = vi.fn();
const findTermination = vi.fn();
const findMember = vi.fn();
const auditLog = vi.fn();
const update = vi.fn();

function chain() {
  const proxy: unknown = new Proxy(
    {},
    { get: (_t, prop) => (prop === "then" ? undefined : () => proxy) },
  );
  return proxy;
}

vi.mock("server-only", () => ({}));
vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/db/audit", () => ({ writeAuditLog: () => Promise.resolve() }));
vi.mock("@/lib/audit-log", () => ({
  createAuditLog: (...a: unknown[]) => {
    auditLog(...a);
    return Promise.resolve();
  },
}));
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      terminations: { findFirst: (...a: unknown[]) => findTermination(...a) },
      organizationMembers: { findFirst: (...a: unknown[]) => findMember(...a) },
    },
    update: () => {
      update();
      return chain();
    },
  },
}));

function signIn(role: string) {
  authMock.mockResolvedValue({ user: { id: "u1", role, isActive: true }, orgId: "org1" });
}
const patch = (body: unknown) =>
  new NextRequest("http://localhost/x", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("R2-TERM-01: an Admin can run the termination they started", () => {
  const load = () => import("@/app/api/hr/termination/[terminationId]/submit/route");
  const params = { params: Promise.resolve({ terminationId: "7" }) };

  it("lets an Admin submit a draft for Super Admin approval", async () => {
    signIn("ADMIN");
    findTermination.mockResolvedValue({ id: 7, status: "DRAFT", userId: "u2", effectiveDate: addDaysToDateString(getTodayString(), 7) });
    const { PATCH } = await load();
    expect((await PATCH(patch({}), params)).status).toBe(200);
    expect(update).toHaveBeenCalled();
  });

  it("still refuses an employee", async () => {
    signIn("EMPLOYEE");
    const { PATCH } = await load();
    expect((await PATCH(patch({}), params)).status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });
});

describe("R2-TERM-02: the deactivate shortcut is refused and audit-logged", () => {
  it("returns 400 and records the refused attempt", async () => {
    signIn("ADMIN");
    findMember.mockResolvedValue({ userId: "u2", role: "EMPLOYEE" });
    const { PATCH } = await import("@/app/api/hr/employees/[employeeId]/route");
    const res = await PATCH(patch({ isActive: false }), {
      params: Promise.resolve({ employeeId: "u2" }),
    });
    expect(res.status).toBe(400);
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "hr.termination_refused", targetId: "u2" }),
    );
    expect(update).not.toHaveBeenCalled();
  });
});
