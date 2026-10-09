import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: vi.fn() } }));

vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      subscriptions: { findFirst: vi.fn(async () => null) },
      userSessions: { findFirst: vi.fn(async () => null) },
      organizationMembers: { findFirst: vi.fn(async () => ({ orgId: "org1" })) },
    },
  },
}));
vi.mock("@/server/queries/invoice", () => ({
  getInvoices: vi.fn(async () => ({ invoices: [], total: 0 })),
  getInvoiceStats: vi.fn(async () => ({})),
}));
vi.mock("@/server/queries/hr", () => ({
  getEmployees: vi.fn(async () => [
    { id: "self", monthlySalary: "50000" },
    { id: "ceo", monthlySalary: "250000" },
  ]),
  getEmployeesPaginated: vi.fn(async () => ({
    data: [
      { id: "self", monthlySalary: "50000" },
      { id: "ceo", monthlySalary: "250000" },
    ],
    pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
  })),
  getEmployee: vi.fn(async (_org: string, id: string) =>
    id === "missing" ? null : { id, monthlySalary: "250000" },
  ),
}));

function signIn(role: string | null) {
  authMock.mockResolvedValue(
    role === null ? null : { user: { id: "self", role, isActive: true }, orgId: "org1" },
  );
}

const req = (path: string, init?: ConstructorParameters<typeof NextRequest>[1]) =>
  new NextRequest(`http://localhost${path}`, init);

beforeEach(() => authMock.mockReset());

describe("invoices GET", () => {
  it("rejects anonymous callers", async () => {
    signIn(null);
    const { GET } = await import("@/app/api/invoices/route");
    expect((await GET(req("/api/invoices"))).status).toBe(401);
  });

  it.each(["ENGINEERING", "DESIGN", "CUSTOMER_SUPPORT", "BRANCH_HR"])("forbids %s", async (role) => {
    signIn(role);
    const list = await import("@/app/api/invoices/route");
    const stats = await import("@/app/api/invoices/stats/route");
    expect((await list.GET(req("/api/invoices"))).status).toBe(403);
    expect((await stats.GET()).status).toBe(403);
  });

  it.each(["CEO", "ADMIN", "HR", "SALES"])("allows %s", async (role) => {
    signIn(role);
    const { GET } = await import("@/app/api/invoices/route");
    expect((await GET(req("/api/invoices"))).status).toBe(200);
  });
});

describe("billing razorpay", () => {
  it("rejects anonymous callers", async () => {
    signIn(null);
    const { GET } = await import("@/app/api/billing/razorpay/route");
    expect((await GET(req("/api/billing/razorpay"))).status).toBe(401);
  });

  it.each(["ENGINEERING", "SALES", "BRANCH_MANAGER"])("forbids %s on GET, POST and PATCH", async (role) => {
    signIn(role);
    const { GET, POST, PATCH } = await import("@/app/api/billing/razorpay/route");
    const body = JSON.stringify({ plan: "STARTER" });
    expect((await GET(req("/api/billing/razorpay"))).status).toBe(403);
    expect((await POST(req("/api/billing/razorpay", { method: "POST", body }))).status).toBe(403);
    expect((await PATCH(req("/api/billing/razorpay", { method: "PATCH", body }))).status).toBe(403);
  });

  it("forbids HR from creating orders", async () => {
    signIn("HR");
    const { POST } = await import("@/app/api/billing/razorpay/route");
    const res = await POST(req("/api/billing/razorpay", { method: "POST", body: JSON.stringify({ plan: "STARTER" }) }));
    expect(res.status).toBe(403);
  });

  it("lets CEO reach order creation", async () => {
    signIn("CEO");
    const { POST } = await import("@/app/api/billing/razorpay/route");
    const res = await POST(req("/api/billing/razorpay", { method: "POST", body: JSON.stringify({ plan: "STARTER" }) }));
    expect(res.status).toBe(503);
  });

  it.each(["CEO", "ADMIN", "HR"])("lets %s view the subscription", async (role) => {
    signIn(role);
    const { GET } = await import("@/app/api/billing/razorpay/route");
    expect((await GET(req("/api/billing/razorpay"))).status).toBe(200);
  });
});

describe("rbac permission catalog", () => {
  it.each(["ENGINEERING", "SALES", "BRANCH_HR"])("forbids %s", async (role) => {
    signIn(role);
    const { GET } = await import("@/app/api/rbac/permissions/route");
    expect((await GET()).status).toBe(403);
  });

  it.each(["CEO", "HR", "ADMIN"])("allows %s", async (role) => {
    signIn(role);
    const { GET } = await import("@/app/api/rbac/permissions/route");
    expect((await GET()).status).toBe(200);
  });
});

describe("employee salary exposure", () => {
  it("hides coworker salaries from ENGINEERING in the plain list", async () => {
    signIn("ENGINEERING");
    const { GET } = await import("@/app/api/hr/employees/route");
    const rows = (await (await GET(req("/api/hr/employees"))).json()) as { id: string; monthlySalary: string | null }[];
    expect(rows.find((r) => r.id === "ceo")?.monthlySalary).toBeNull();
    expect(rows.find((r) => r.id === "self")?.monthlySalary).toBe("50000");
  });

  it("hides coworker salaries from ENGINEERING in the paginated list", async () => {
    signIn("ENGINEERING");
    const { GET } = await import("@/app/api/hr/employees/route");
    const body = (await (await GET(req("/api/hr/employees?page=1"))).json()) as { data: { id: string; monthlySalary: string | null }[] };
    expect(body.data.find((r) => r.id === "ceo")?.monthlySalary).toBeNull();
  });

  it("hides a coworker salary on the detail endpoint", async () => {
    signIn("ENGINEERING");
    const { GET } = await import("@/app/api/hr/employees/[employeeId]/route");
    const res = await GET(req("/api/hr/employees/ceo"), { params: Promise.resolve({ employeeId: "ceo" }) });
    expect(((await res.json()) as { monthlySalary: string | null }).monthlySalary).toBeNull();
  });

  it("returns 404 for an unknown employee", async () => {
    signIn("ENGINEERING");
    const { GET } = await import("@/app/api/hr/employees/[employeeId]/route");
    const res = await GET(req("/api/hr/employees/missing"), { params: Promise.resolve({ employeeId: "missing" }) });
    expect(res.status).toBe(404);
  });

  it.each(["CEO", "HR", "ADMIN"])("shows salaries to %s", async (role) => {
    signIn(role);
    const { GET } = await import("@/app/api/hr/employees/route");
    const rows = (await (await GET(req("/api/hr/employees"))).json()) as { id: string; monthlySalary: string | null }[];
    expect(rows.find((r) => r.id === "ceo")?.monthlySalary).toBe("250000");
  });
});
