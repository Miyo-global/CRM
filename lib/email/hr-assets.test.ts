import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockInnerJoin = vi.fn();
const mockWhere = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => {
      mockSelect(...args);
      return { from: mockFrom };
    },
  },
}));

vi.mock("@/lib/db/schema", () => ({
  organizationMembers: { orgId: "orgId", userId: "userId", role: "role" },
  users: { id: "id", email: "email", name: "name", isActive: "isActive" },
}));

vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => args,
  eq: (...args: unknown[]) => args,
  inArray: (...args: unknown[]) => args,
}));

import { getAssetAssignmentHrRecipients } from "./hr-assets";

describe("getAssetAssignmentHrRecipients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ innerJoin: mockInnerJoin });
    mockInnerJoin.mockReturnValue({ where: mockWhere });
  });

  it("includes org HR roles and always adds the shared HR inbox", async () => {
    mockWhere.mockResolvedValue([
      { email: "hr.person@company.com", name: "HR Person" },
      { email: "admin@company.com", name: "Admin User" },
    ]);

    const recipients = await getAssetAssignmentHrRecipients("org_1");
    const emails = recipients.map((r) => r.email.toLowerCase());

    expect(emails).toContain("hr.person@company.com");
    expect(emails).toContain("admin@company.com");
    expect(emails).toContain("hr@miyoglobal.com");
    expect(recipients.find((r) => r.email === "hr@miyoglobal.com")?.name).toBe("HR Team");
  });

  it("deduplicates when an HR user already uses the shared inbox address", async () => {
    mockWhere.mockResolvedValue([{ email: "hr@miyoglobal.com", name: "Shared HR" }]);

    const recipients = await getAssetAssignmentHrRecipients("org_1");

    expect(recipients).toHaveLength(1);
    expect(recipients[0]?.email).toBe("hr@miyoglobal.com");
    expect(recipients[0]?.name).toBe("Shared HR");
  });
});
