import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.fn();
const getMyIssues = vi.fn(async (_org: string, _userId: string) => [] as unknown[]);

vi.mock("server-only", () => ({}));
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

const fullRow = (id: string) => ({
  id,
  name: `User ${id}`,
  firstName: "User",
  lastName: id,
  email: `${id}@example.com`,
  image: null,
  designation: "Engineer",
  department: { id: 1, name: "Engineering" },
  departmentId: 1,
  role: "EMPLOYEE",
  isActive: true,
  monthlySalary: "90000",
  phone: "+91 90000 00000",
  bio: "bio",
  linkedinUrl: "https://linkedin.example/x",
  twitterUrl: "https://twitter.example/x",
  githubUrl: "https://github.example/x",
  websiteUrl: "https://site.example",
  reportingTo: "boss",
});

vi.mock("@/server/queries/hr", () => ({
  getEmployees: vi.fn(async () => [fullRow("self"), fullRow("other")]),
  getEmployeesPaginated: vi.fn(async () => ({
    data: [fullRow("self"), fullRow("other")],
    pagination: { page: 1, limit: 25, total: 2, totalPages: 1 },
  })),
}));
vi.mock("@/server/queries/dashboard", () => ({ getMyIssues: (o: string, u: string) => getMyIssues(o, u) }));

const SENSITIVE = ["monthlySalary", "phone", "bio", "linkedinUrl", "twitterUrl", "githubUrl", "websiteUrl", "reportingTo"];

function signIn(role: string) {
  authMock.mockResolvedValue({ user: { id: "self", role, isActive: true }, orgId: "org1" });
}
const req = (path: string) => new NextRequest(`http://localhost${path}`);

async function list(path: string) {
  const { GET } = await import("@/app/api/hr/employees/route");
  const res = await GET(req(path));
  const body = (await res.json()) as Record<string, unknown>[] | { data: Record<string, unknown>[] };
  return { res, rows: Array.isArray(body) ? body : body.data };
}

beforeEach(() => {
  authMock.mockReset();
  getMyIssues.mockClear();
});

describe("R3-NET-01 employee list field allow-list", () => {
  it.each(["EMPLOYEE", "ENGINEERING"])("%s never receives a colleague's sensitive fields", async (role) => {
    signIn(role);
    for (const path of ["/api/hr/employees", "/api/hr/employees?page=1&limit=25"]) {
      const { rows } = await list(path);
      const other = rows.find((r) => r.id === "other")!;
      for (const key of SENSITIVE) expect(other, `${path} ${key}`).not.toHaveProperty(key);
      expect(other.name).toBe("User other");
    }
  });

  it("an employee still sees their own full record", async () => {
    signIn("EMPLOYEE");
    const { rows } = await list("/api/hr/employees");
    expect(rows.find((r) => r.id === "self")?.monthlySalary).toBe("90000");
  });

  it.each(["CEO", "HR", "ADMIN"])("%s receives the full HR record", async (role) => {
    signIn(role);
    const { rows } = await list("/api/hr/employees");
    const other = rows.find((r) => r.id === "other")!;
    for (const key of SENSITIVE) expect(other).toHaveProperty(key);
  });

  it.each(["EMPLOYEE", "HR", "ADMIN", "CEO"])("?fields=picker gives %s only the picker projection", async (role) => {
    signIn(role);
    const { rows } = await list("/api/hr/employees?fields=picker");
    for (const row of rows) {
      for (const key of SENSITIVE) expect(row).not.toHaveProperty(key);
      expect(row).toHaveProperty("name");
      expect(row).toHaveProperty("department");
    }
    // A colleague's work email stays hidden from non-admins (QA-0062).
    const other = rows.find((r) => r.id === "other")!;
    expect("email" in other).toBe(role !== "EMPLOYEE");
  });
});

describe("R3-NET-02 Cache-Control on authenticated API JSON", () => {
  it("is private, no-store", async () => {
    signIn("EMPLOYEE");
    const { res } = await list("/api/hr/employees");
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });
});

describe("R3-NET-03 my-issues ignores a client userId", () => {
  it.each(["EMPLOYEE", "ADMIN"])("%s gets their own issues even when passing another id", async (role) => {
    signIn(role);
    const { GET } = await import("@/app/api/dashboard/my-issues/route");
    const res = await GET(req("/api/dashboard/my-issues?userId=someone-else&limit=20"));
    expect(res.status).toBe(200);
    expect(getMyIssues).toHaveBeenCalledWith("org1", "self");
    expect(getMyIssues).not.toHaveBeenCalledWith(expect.anything(), "someone-else");
  });
});

describe("R3-NET-01 joined user rows (certifications, skills, documents, exits, PIPs...)", () => {
  it("USER_CARD never selects secrets or HR-only fields", async () => {
    const { USER_CARD } = await import("@/lib/db/user-card-columns");
    for (const key of [...SENSITIVE, "password", "bankDetails", "taxId", "googleRefreshToken", "dateOfBirth", "personalEmail"]) {
      expect(USER_CARD.columns).not.toHaveProperty(key);
    }
  });
});
