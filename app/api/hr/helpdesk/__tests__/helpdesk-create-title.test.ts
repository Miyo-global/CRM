import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { helpdeskTicketSchema } from "@/lib/validations/common-forms";

/**
 * R3-EMP-05: ticket "QA-TEST ticket" was stored as "QA-". Nothing on the
 * server may cut a title at a hyphen: the form schema and the API keep it as
 * typed (spaces collapsed, ends trimmed).
 */
const authMock = vi.fn();
const inserted: Record<string, unknown>[] = [];

vi.mock("server-only", () => ({}));
vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/after-response", () => ({ afterResponse: () => {} }));
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
    insert: () => ({
      values: (v: Record<string, unknown>) => {
        inserted.push(v);
        return { returning: async () => [{ id: 2, ...v }] };
      },
    }),
    query: {
      userSessions: { findFirst: vi.fn(async () => null) },
      organizationMembers: { findFirst: vi.fn(async () => ({ orgId: "org1" })) },
    },
  },
}));

beforeEach(() => {
  inserted.length = 0;
  authMock.mockResolvedValue({ user: { id: "emp1", role: "EMPLOYEE", isActive: true }, orgId: "org1" });
});

const TITLES = ["QA-TEST ticket", "QA-", "a-b-c - d", "Laptop -- charger"];

describe("helpdesk ticket title is stored as typed (R3-EMP-05)", () => {
  it.each(TITLES)("form schema keeps %j", (title) => {
    const parsed = helpdeskTicketSchema.parse({ title, category: "HR Query", priority: "HIGH" });
    expect(parsed.title).toBe(title);
  });

  it.each(TITLES)("POST /api/hr/helpdesk stores %j", async (title) => {
    const { POST } = await import("@/app/api/hr/helpdesk/route");
    const res = await POST(
      new NextRequest("http://localhost/api/hr/helpdesk", {
        method: "POST",
        body: JSON.stringify({ title, description: "d", category: "HR Query", priority: "HIGH" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(inserted[0]?.title).toBe(title);
  });
});
