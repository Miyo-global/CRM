import { beforeEach, describe, expect, it, vi } from "vitest";

import { harness, kbMocks, kbRequest } from "@/test/kb-route-harness";

vi.mock("@/lib/auth", () => kbMocks.auth());
vi.mock("@/lib/audit-log", () => kbMocks.auditLog());
vi.mock("@/lib/logger", () => kbMocks.logger());
vi.mock("@/lib/db", () => kbMocks.db());
vi.mock("@/server/queries/hr", () => ({
  getSalaryStructures: async () => [
    { id: 1, userId: "emp-1", professionalTax: "200.00" },
    { id: 2, userId: "hr-1", professionalTax: "150.00" },
  ],
}));

const { GET, PATCH } = await import("../[userId]/professional-tax/route");
const { GET: LIST } = await import("../route");

const url = "/api/hr/salary-structures/emp-1/professional-tax";
const params = (userId = "emp-1") => ({ params: Promise.resolve({ userId }) });
const as = (role: string, id = "actor-1", extra: Record<string, unknown> = {}) => {
  harness.session = { user: { id, role, ...extra }, orgId: "org-a" };
};
const patch = (body: unknown, userId = "emp-1") =>
  PATCH(
    kbRequest(`/api/hr/salary-structures/${userId}/professional-tax`, { method: "PATCH", body }) as never,
    params(userId) as never,
  );

beforeEach(() => {
  harness.reset();
  harness.findFirst = {
    organizationMembers: { id: 1 },
    salaryStructures: { id: 10, professionalTax: "200.00" },
    users: { name: "QA-TEST Employee" },
  };
});

describe("GET professional tax", () => {
  it("401 without a session", async () => {
    harness.session = null;
    const res = await GET(kbRequest(url) as never, params() as never);
    expect(res.status).toBe(401);
  });

  it("403 for an employee looking at someone else, with no PT in the body", async () => {
    as("EMPLOYEE");
    const res = await GET(kbRequest(url) as never, params() as never);
    expect(res.status).toBe(403);
    expect(JSON.stringify(await res.json())).not.toContain("200");
  });

  it("403 for a deactivated account", async () => {
    as("HR", "actor-1", { isActive: false });
    const res = await GET(kbRequest(url) as never, params() as never);
    expect(res.status).toBe(403);
  });

  it.each(["CEO", "ADMIN", "HR"])("%s sees the value and may edit it", async (role) => {
    as(role);
    const res = await GET(kbRequest(url) as never, params() as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ professionalTax: "200.00", hasSalaryStructure: true, canEdit: true });
  });

  it("HR viewing their own PT may not edit it", async () => {
    as("HR", "emp-1");
    const res = await GET(kbRequest(url) as never, params() as never);
    expect(await res.json()).toMatchObject({ canEdit: false });
  });

  it("404 for someone outside the org", async () => {
    as("HR");
    harness.findFirst = { ...harness.findFirst, organizationMembers: undefined };
    const res = await GET(kbRequest(url) as never, params() as never);
    expect(res.status).toBe(404);
  });
});

describe("PATCH professional tax", () => {
  it("403 for an employee, and nothing is written", async () => {
    as("EMPLOYEE");
    const res = await patch({ professionalTax: "250" });
    expect(res.status).toBe(403);
    expect(harness.updates).toEqual([]);
    expect(harness.audits).toEqual([]);
  });

  it.each(["CEO", "ADMIN", "HR"])("%s changes it, audited with old and new values", async (role) => {
    as(role);
    const res = await patch({ professionalTax: "250" });
    expect(res.status).toBe(200);
    expect(harness.updates[0]).toMatchObject({ professionalTax: "250.00" });
    expect(harness.audits).toHaveLength(1);
    expect(harness.audits[0]).toMatchObject({
      action: "EMPLOYEE_PT_UPDATED",
      userId: "actor-1",
      targetId: "emp-1",
      metadata: {
        employeeId: "emp-1",
        employeeName: "QA-TEST Employee",
        oldValue: "200.00",
        newValue: "250.00",
        actorRole: role,
        summary: "PT ₹200.00 → ₹250.00",
      },
    });
  });

  it("saving the same value writes no audit entry", async () => {
    as("HR");
    const res = await patch({ professionalTax: "200.00" });
    expect(res.status).toBe(200);
    expect(harness.audits).toEqual([]);
  });

  it("not applicable stores NULL", async () => {
    as("HR");
    const res = await patch({ professionalTax: null });
    expect(res.status).toBe(200);
    expect(harness.updates[0]).toMatchObject({ professionalTax: null });
    expect(harness.audits[0]).toMatchObject({ metadata: { summary: "PT ₹200.00 → N/A" } });
  });

  it.each(["-50", "2501", "1e9", "abc", "200.555", " 200", -50])(
    "400 for %j even when the client is bypassed; nothing written",
    async (value) => {
      as("HR");
      const res = await patch({ professionalTax: value });
      expect(res.status).toBe(400);
      expect(harness.updates).toEqual([]);
      expect(harness.audits).toEqual([]);
    },
  );

  it("400 for unknown keys (a client-supplied user id is never trusted)", async () => {
    as("HR");
    const res = await patch({ professionalTax: "250", userId: "someone-else" });
    expect(res.status).toBe(400);
  });

  it.each(["HR", "ADMIN"])("%s may not change their own PT", async (role) => {
    as(role, "emp-1");
    const res = await patch({ professionalTax: "250" });
    expect(res.status).toBe(403);
    expect(harness.updates).toEqual([]);
  });

  it("the Super Admin may change their own PT", async () => {
    as("CEO", "emp-1");
    const res = await patch({ professionalTax: "250" });
    expect(res.status).toBe(200);
  });

  it("409 when the employee has no salary structure yet", async () => {
    as("HR");
    harness.findFirst = { ...harness.findFirst, salaryStructures: undefined };
    const res = await patch({ professionalTax: "250" });
    expect(res.status).toBe(409);
  });
});

describe("GET salary structures leaves PT out without hr:payroll:pt:view", () => {
  it("drops other people's PT when the permission is revoked", async () => {
    as("HR", "hr-1");
    harness.findMany = {
      userPermissions: [{ granted: false, permission: { name: "hr:payroll:pt:view" } }],
    };
    const res = await LIST(kbRequest("/api/hr/salary-structures") as never);
    const rows = (await res.json()) as Array<Record<string, unknown>>;
    expect(rows.find((r) => r.userId === "emp-1")).not.toHaveProperty("professionalTax");
    expect(rows.find((r) => r.userId === "hr-1")).toHaveProperty("professionalTax", "150.00");
  });

  it("keeps it for HR with the default permission", async () => {
    as("HR", "hr-1");
    const res = await LIST(kbRequest("/api/hr/salary-structures") as never);
    const rows = (await res.json()) as Array<Record<string, unknown>>;
    expect(rows.find((r) => r.userId === "emp-1")).toHaveProperty("professionalTax", "200.00");
  });
});
