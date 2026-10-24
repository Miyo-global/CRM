import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.fn();
const findResignation = vi.fn();
const findTermination = vi.fn();
const setValues = vi.fn();
const insertValues = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
const auditLog = vi.fn();
vi.mock("@/lib/audit-log", () => ({ createAuditLog: (...a: unknown[]) => (auditLog(...a), Promise.resolve()) }));
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: () => Promise.resolve() } }));
vi.mock("@/lib/email", () => ({ sendResignationApprovedEmail: () => Promise.resolve() }));
vi.mock("next/server", async (orig) => ({
  ...(await orig<typeof import("next/server")>()),
  after: () => undefined,
}));
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      resignations: { findFirst: (...a: unknown[]) => findResignation(...a) },
      terminations: { findFirst: (...a: unknown[]) => findTermination(...a) },
      users: { findFirst: () => Promise.resolve({ name: "Emp", email: "e@x.io" }) },
    },
    update: () => ({
      set: (v: unknown) => {
        setValues(v);
        return { where: () => Promise.resolve() };
      },
    }),
    insert: () => ({
      values: (v: unknown) => {
        insertValues(v);
        return Promise.resolve();
      },
    }),
  },
}));

function signIn(role: string, id = "u1") {
  authMock.mockResolvedValue({ user: { id, role, isActive: true }, orgId: "org1" });
}
const patch = (body: unknown) =>
  new NextRequest("http://localhost/x", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
const params = { params: Promise.resolve({ resignationId: "5" }) };
const resignation = (status: string) => ({
  id: 5,
  orgId: "org1",
  userId: "emp1",
  status,
  reason: "Moving cities",
  lastWorkingDate: "2026-12-21",
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("R2-TERM-05: HR review", () => {
  const load = () => import("@/app/api/hr/exit/[resignationId]/hr-review/route");

  it("lets an Admin accept and move the last working day", async () => {
    signIn("ADMIN");
    findResignation.mockResolvedValue(resignation("PENDING_HR"));
    const { PATCH } = await load();
    const res = await PATCH(patch({ decision: "approve", lastWorkingDate: "2026-11-30" }), params);
    expect(res.status).toBe(200);
    expect(setValues).toHaveBeenCalledWith(
      expect.objectContaining({ status: "HR_APPROVED", lastWorkingDate: "2026-11-30" }),
    );
  });

  it("refuses a reviewer acting on their own resignation", async () => {
    signIn("HR", "emp1");
    findResignation.mockResolvedValue(resignation("PENDING_HR"));
    const { PATCH } = await load();
    expect((await PATCH(patch({ decision: "approve" }), params)).status).toBe(403);
    expect(setValues).not.toHaveBeenCalled();
  });
});

describe("R2-TERM-05: final sign-off opens a termination record", () => {
  const load = () => import("@/app/api/hr/exit/[resignationId]/ceo-review/route");

  it("creates a SENT termination for the employee", async () => {
    signIn("CEO");
    findResignation.mockResolvedValue(resignation("HR_APPROVED"));
    findTermination.mockResolvedValue(undefined);
    const { PATCH } = await load();
    expect((await PATCH(patch({ decision: "approve" }), params)).status).toBe(200);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "emp1",
        status: "SENT",
        reasons: ["Resignation"],
        effectiveDate: "2026-12-21",
      }),
    );
  });

  it("does not duplicate an existing termination", async () => {
    signIn("ADMIN");
    findResignation.mockResolvedValue(resignation("HR_APPROVED"));
    findTermination.mockResolvedValue({ id: 3 });
    const { PATCH } = await load();
    expect((await PATCH(patch({ decision: "approve" }), params)).status).toBe(200);
    expect(insertValues).not.toHaveBeenCalled();
  });
});

describe("R3-ADM-12: resignation steps are audit-logged", () => {
  it("HR review logs hr.resignation_reviewed with the LWD change", async () => {
    signIn("ADMIN");
    findResignation.mockResolvedValue(resignation("PENDING_HR"));
    const { PATCH } = await import("@/app/api/hr/exit/[resignationId]/hr-review/route");
    await PATCH(patch({ decision: "approve", lastWorkingDate: "2026-11-30" }), params);
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "hr.resignation_reviewed",
        metadata: expect.objectContaining({
          to: "HR_APPROVED",
          lastWorkingDate: { from: "2026-12-21", to: "2026-11-30" },
        }),
      }),
    );
  });

  it("final sign-off logs hr.resignation_signed_off", async () => {
    signIn("CEO");
    findResignation.mockResolvedValue(resignation("HR_APPROVED"));
    findTermination.mockResolvedValue({ id: 3 });
    const { PATCH } = await import("@/app/api/hr/exit/[resignationId]/ceo-review/route");
    await PATCH(patch({ decision: "approve" }), params);
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "hr.resignation_signed_off", targetId: "5" }),
    );
  });
});
