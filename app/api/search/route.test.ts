import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getTableName, type SQL, type Table } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/redis", () => ({ redis: null, isRedisEnabled: () => false }));

// Every select chain records the table it read and the WHERE it used.
const wheres = new Map<string, SQL>();
const failTable = { name: "" };
vi.mock("@/lib/db", () => ({
  db: {
    query: { userSessions: { findFirst: async () => null } },
    select: () => {
      let table = "";
      const chain = {
        from: (t: Table) => ((table = getTableName(t)), chain),
        innerJoin: () => chain,
        leftJoin: () => chain,
        where: (w: SQL) => (wheres.set(table, w), chain),
        orderBy: () => chain,
        limit: async () => {
          if (table === failTable.name) throw new Error("boom");
          return [];
        },
      };
      return chain;
    },
  },
}));

const { GET } = await import("./route");
const dialect = new PgDialect();
const paramsOf = (table: string) => dialect.sqlToQuery(wheres.get(table)!).params;

async function search(role: string) {
  wheres.clear();
  authMock.mockResolvedValue({ user: { id: "viewer-1", isActive: true, role }, orgId: "org1" });
  return GET(new NextRequest("http://localhost/api/search?q=QA-TEST"));
}

describe("GET /api/search scoping (QA-BUG-25)", () => {
  it("an employee only searches their own leaves and Helpdesk tickets", async () => {
    expect((await search("EMPLOYEE")).status).toBe(200);
    expect(paramsOf("leave_requests")).toContain("viewer-1");
    expect(paramsOf("helpdesk_tickets")).toContain("viewer-1");
    expect(paramsOf("holidays")).not.toContain("viewer-1");
    expect(paramsOf("calendar_events")).not.toContain("viewer-1");
  });

  it("an employee only searches their own assets, bonuses, expenses and documents (R2-CRUD-10)", async () => {
    await search("EMPLOYEE");
    for (const table of ["assets", "bonuses", "expenses", "documents", "rich_documents"]) {
      expect(paramsOf(table)).toContain("viewer-1");
    }
  });

  it("an admin searches the whole org", async () => {
    await search("ADMIN");
    expect(paramsOf("leave_requests")).not.toContain("viewer-1");
    expect(paramsOf("helpdesk_tickets")).not.toContain("viewer-1");
    expect(paramsOf("expenses")).not.toContain("viewer-1");
    expect(paramsOf("documents")).not.toContain("viewer-1");
  });

  it("escapes LIKE wildcards", async () => {
    wheres.clear();
    authMock.mockResolvedValue({ user: { id: "viewer-1", isActive: true, role: "EMPLOYEE" }, orgId: "org1" });
    await GET(new NextRequest("http://localhost/api/search?q=100%25_x"));
    expect(paramsOf("holidays")).toContain("%100\\%\\_x%");
  });

  it("one failing source does not fail the search (QA-BUG-06)", async () => {
    failTable.name = "leave_requests";
    const res = await search("EMPLOYEE");
    failTable.name = "";
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ results: [], failedSources: ["leaves"] });
  });
});
