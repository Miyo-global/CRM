import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { addDaysToDateString, getTodayString } from "@/lib/date-utils";

/**
 * R3-HR-02, R3-HR-05, R3-ADM-08, R3-ROLE-01: the API rejects what the UI hides.
 * Each guard runs before any write, so the db mock only answers lookups.
 */
const authMock = vi.fn();
const findMember = vi.fn();
const insert = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/db/audit", () => ({ writeAuditLog: () => Promise.resolve() }));
vi.mock("@/lib/hr/termination-reasons", () => ({
  ensureTerminationReasonsForOrg: async () => [],
  isAllowedTerminationReason: () => false,
}));
vi.mock("@/lib/api/helpers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/helpers")>()),
  // The schemas are tested elsewhere; these tests are about the role gate.
  parseBody: async (req: Request) => req.json(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: { findFirst: async () => undefined },
      roles: { findFirst: async () => undefined },
      organizationMembers: { findFirst: (...a: unknown[]) => findMember(...a) },
    },
    insert: () => {
      insert();
      throw new Error("no writes expected");
    },
  },
}));

function signIn(role: string) {
  authMock.mockResolvedValue({ user: { id: "actor", role, isActive: true }, orgId: "org1" });
}
const post = (body: unknown) =>
  new NextRequest("http://localhost/x", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });

beforeEach(() => vi.clearAllMocks());

describe("POST /api/hr/employees/onboard enforces canGrantRole (R3-HR-02)", () => {
  const load = () => import("@/app/api/hr/employees/onboard/route");
  const body = (role: string) => ({ email: "qa-test@example.com", role });

  it.each([
    ["HR", "ADMIN"],
    ["HR", "HR"],
    ["ADMIN", "CEO"],
    ["CEO", "CEO"],
  ])("%s onboarding a %s gets 403", async (actor, role) => {
    signIn(actor);
    const { POST } = await load();
    expect((await POST(post(body(role)))).status).toBe(403);
    expect(insert).not.toHaveBeenCalled();
  });
});

describe("POST /api/hr/termination: Admin and HR cannot start one for Admin/HR (R3-ADM-08)", () => {
  const load = () => import("@/app/api/hr/termination/route");
  const body = {
    userId: "target",
    reasons: ["Misconduct"],
    detailedExplanation: "QA-TEST",
    effectiveDate: addDaysToDateString(getTodayString(), 7),
  };

  it.each([
    ["ADMIN", "ADMIN"],
    ["ADMIN", "HR"],
    ["HR", "ADMIN"],
    ["HR", "HR"],
  ])("%s -> %s target gets 403", async (actor, target) => {
    signIn(actor);
    findMember.mockResolvedValue({ userId: "target", role: target });
    const { POST } = await load();
    expect((await POST(post(body))).status).toBe(403);
  });

  it.each([
    ["ADMIN", "EMPLOYEE"],
    ["CEO", "ADMIN"],
  ])("%s -> %s target passes the rank gate", async (actor, target) => {
    signIn(actor);
    findMember.mockResolvedValue({ userId: "target", role: target });
    const { POST } = await load();
    // The reasons mock rejects everything, so passing the gate means 400.
    expect((await POST(post(body))).status).toBe(400);
  });
});

describe("POST /api/hr/job-roles is Admin/Super Admin only (R3-HR-05)", () => {
  it.each(["HR", "EMPLOYEE"])("%s gets 403", async (role) => {
    signIn(role);
    const { POST } = await import("@/app/api/hr/job-roles/route");
    expect((await POST(post({ title: "QA-TEST Tester" }))).status).toBe(403);
  });
});

describe("creating custom roles needs roles:manage (R3-ROLE-01)", () => {
  it.each(["ADMIN", "HR"])("%s gets 403 on POST /api/roles and /api/roles/templates", async (role) => {
    signIn(role);
    const roles = await import("@/app/api/roles/route");
    const templates = await import("@/app/api/roles/templates/route");
    expect((await roles.POST(post({ name: "QA", slug: "QA" }))).status).toBe(403);
    expect((await templates.POST(post({ templateId: "x" }))).status).toBe(403);
  });
});

describe("editing and deleting roles needs roles:manage (R3-ROLE-01 follow-up)", () => {
  const params = { params: Promise.resolve({ roleId: "9" }) };
  it.each(["ADMIN", "HR"])("%s gets 403 on PATCH and DELETE /api/roles/[roleId]", async (role) => {
    signIn(role);
    const route = await import("@/app/api/roles/[roleId]/route");
    const patchReq = new NextRequest("http://localhost/x", {
      method: "PATCH",
      body: JSON.stringify({ permissions: ["roles:manage"] }),
      headers: { "content-type": "application/json" },
    });
    expect((await route.PATCH(patchReq, params)).status).toBe(403);
    expect((await route.DELETE(new NextRequest("http://localhost/x", { method: "DELETE" }), params)).status).toBe(403);
  });
});
