import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { addDaysToDateString, getTodayString } from "@/lib/date-utils";

/** R3-ADM-02 / R3-ADM-07 / R3-SA-04 route guards. */
const authMock = vi.fn();
const findTermination = vi.fn();
const findTerminations = vi.fn();
const findUser = vi.fn();
const findMember = vi.fn();
const auditLog = vi.fn();
const writes = vi.fn();
const fnfRow = vi.fn();

function chain(result: unknown = [{ id: 1 }]) {
  const proxy: unknown = new Proxy(
    {},
    {
      get: (_t, prop) =>
        prop === "then"
          ? (res: (v: unknown) => void) => res(result)
          : prop === "catch"
            ? () => proxy
            : () => proxy,
    },
  );
  return proxy;
}

vi.mock("server-only", () => ({}));
vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/db/audit", () => ({ writeAuditLog: () => Promise.resolve() }));
vi.mock("@/lib/audit-log", async (orig) => ({
  ...(await orig<typeof import("@/lib/audit-log")>()),
  createAuditLog: (...a: unknown[]) => (auditLog(...a), Promise.resolve()),
}));
vi.mock("@/lib/hr/termination-reasons", () => ({
  ensureTerminationReasonsForOrg: async () => [],
  isAllowedTerminationReason: () => true,
}));
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      terminations: {
        findFirst: (...a: unknown[]) => findTermination(...a),
        findMany: (...a: unknown[]) => findTerminations(...a),
      },
      users: { findFirst: (...a: unknown[]) => findUser(...a) },
      organizationMembers: { findFirst: (...a: unknown[]) => findMember(...a) },
    },
    insert: (...a: unknown[]) => (writes("insert", ...a), chain()),
    update: (...a: unknown[]) => (writes("update", ...a), chain()),
    delete: (...a: unknown[]) => (writes("delete", ...a), chain()),
    select: () => chain([fnfRow()]),
  },
}));

function signIn(role: string) {
  authMock.mockResolvedValue({ user: { id: "actor", role, isActive: true }, orgId: "org1" });
}
const req = (method: string, body?: unknown) =>
  new NextRequest("http://localhost/x", {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
const today = getTodayString();
const createBody = (effectiveDate: string) => ({
  userId: "emp1",
  reasons: ["Misconduct"],
  detailedExplanation: "QA-TEST explanation",
  effectiveDate,
});
const params = { params: Promise.resolve({ terminationId: "7" }) };

beforeEach(() => {
  vi.clearAllMocks();
  findMember.mockResolvedValue({ userId: "emp1", role: "EMPLOYEE" });
  findUser.mockResolvedValue({ isActive: true });
  findTerminations.mockResolvedValue([]);
});

describe("POST /api/hr/termination effective date (R3-ADM-02)", () => {
  const load = () => import("@/app/api/hr/termination/route");

  it.each([
    ["ADMIN", addDaysToDateString(today, -1), 400],
    ["ADMIN", addDaysToDateString(today, 366), 400],
    ["CEO", addDaysToDateString(today, 366), 400],
    ["ADMIN", today, 201],
    ["CEO", addDaysToDateString(today, -30), 201], // Super Admin may backdate
  ])("%s with %s -> %i", async (role, date, status) => {
    signIn(role);
    const { POST } = await load();
    expect((await POST(req("POST", createBody(date)))).status).toBe(status);
  });
});

describe("one open termination per employee (R3-ADM-07)", () => {
  const load = () => import("@/app/api/hr/termination/route");

  it("refuses a second open termination with 409", async () => {
    signIn("ADMIN");
    findTerminations.mockResolvedValue([{ id: 2, status: "DRAFT", effectiveDate: today }]);
    const { POST } = await load();
    expect((await POST(req("POST", createBody(today)))).status).toBe(409);
    expect(writes).not.toHaveBeenCalledWith("insert", expect.anything());
  });

  it("refuses someone already terminated", async () => {
    signIn("CEO");
    findUser.mockResolvedValue({ isActive: false });
    const { POST } = await load();
    expect((await POST(req("POST", createBody(today)))).status).toBe(409);
  });

  it("allows a new one when the earlier was rejected or cancelled", async () => {
    signIn("ADMIN");
    findTerminations.mockResolvedValue([
      { id: 2, status: "REJECTED", effectiveDate: today },
      { id: 3, status: "CANCELLED", effectiveDate: today },
    ]);
    const { POST } = await load();
    expect((await POST(req("POST", createBody(today)))).status).toBe(201);
  });
});

describe("draft edit / delete and cancel (R3-ADM-07)", () => {
  const draftRoute = () => import("@/app/api/hr/termination/[terminationId]/route");
  const cancelRoute = () => import("@/app/api/hr/termination/[terminationId]/cancel/route");
  const record = (status: string) => ({
    id: 7,
    userId: "emp1",
    status,
    reasons: ["Misconduct"],
    detailedExplanation: "QA-TEST explanation",
    effectiveDate: today,
    severanceAmount: null,
    noticePeriodWaived: false,
    internalNotes: null,
    evidenceUrls: null,
  });

  it("deletes a draft and audit-logs it", async () => {
    signIn("ADMIN");
    findTermination.mockResolvedValue(record("DRAFT"));
    const { DELETE } = await draftRoute();
    expect((await DELETE(req("DELETE"), params)).status).toBe(200);
    expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "hr.termination_deleted" }));
  });

  it.each(["PENDING_CEO", "SENT", "COMPLETED"])("refuses to delete a %s termination", async (status) => {
    signIn("ADMIN");
    findTermination.mockResolvedValue(record(status));
    const { DELETE } = await draftRoute();
    expect((await DELETE(req("DELETE"), params)).status).toBe(400);
  });

  it("edit logs only the fields that changed", async () => {
    signIn("ADMIN");
    findTermination.mockResolvedValue(record("DRAFT"));
    const { PATCH } = await draftRoute();
    const next = addDaysToDateString(today, 10);
    const res = await PATCH(
      req("PATCH", { reasons: ["Misconduct"], detailedExplanation: "QA-TEST explanation", effectiveDate: next }),
      params,
    );
    expect(res.status).toBe(200);
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "hr.termination_updated",
        metadata: expect.objectContaining({ changes: { effectiveDate: { from: today, to: next } } }),
      }),
    );
  });

  it("edit refuses a past date for an Admin", async () => {
    signIn("ADMIN");
    findTermination.mockResolvedValue(record("DRAFT"));
    const { PATCH } = await draftRoute();
    const res = await PATCH(
      req("PATCH", { reasons: ["Misconduct"], detailedExplanation: "x", effectiveDate: addDaysToDateString(today, -1) }),
      params,
    );
    expect(res.status).toBe(400);
  });

  it("cancels a submitted termination", async () => {
    signIn("ADMIN");
    findTermination.mockResolvedValue(record("PENDING_CEO"));
    const { PATCH } = await cancelRoute();
    expect((await PATCH(req("PATCH", { reason: "Resolved informally" }), params)).status).toBe(200);
    expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "hr.termination_cancelled" }));
  });

  it("does not cancel once the email is sent", async () => {
    signIn("ADMIN");
    findTermination.mockResolvedValue(record("SENT"));
    const { PATCH } = await cancelRoute();
    expect((await PATCH(req("PATCH", { reason: "Resolved informally" }), params)).status).toBe(400);
  });
});

describe("PATCH /api/hr/fnf/[id] (R3-SA-04)", () => {
  const load = () => import("@/app/api/hr/fnf/[fnfId]/route");
  const fnfParams = { params: Promise.resolve({ fnfId: "4" }) };
  const empty = { id: 4, status: "DRAFT", basicDues: "0", leaveEncashment: "0", bonusDue: "0", deductions: "0", loanRecovery: "0", notes: null };

  it("refuses to complete an empty draft", async () => {
    signIn("CEO");
    fnfRow.mockReturnValue(empty);
    const { PATCH } = await load();
    expect((await PATCH(req("PATCH", { status: "PAID" }), fnfParams)).status).toBe(400);
  });

  it("completes once figures are entered", async () => {
    signIn("CEO");
    fnfRow.mockReturnValue(empty);
    const { PATCH } = await load();
    expect((await PATCH(req("PATCH", { status: "PAID", basicDues: 50000 }), fnfParams)).status).toBe(200);
  });
});
