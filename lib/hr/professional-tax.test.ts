import { beforeEach, describe, expect, it, vi } from "vitest";

const audits: Array<Record<string, unknown>> = [];
vi.mock("@/lib/audit-log", () => ({
  createAuditLog: async (entry: Record<string, unknown>) => {
    audits.push(entry);
  },
}));
vi.mock("@/lib/db", () => ({ db: {} }));

const { auditProfessionalTax, professionalTaxDiffSummary, sameProfessionalTax } = await import("./professional-tax");

const base = { orgId: "org-a", actorId: "hr-1", actorRole: "HR", employeeId: "emp-1" };

beforeEach(() => {
  audits.length = 0;
});

describe("professional tax audit", () => {
  it("EMPLOYEE_PT_SET on create, with the new value", async () => {
    await auditProfessionalTax({ ...base, oldValue: null, newValue: 200, isCreate: true });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      action: "EMPLOYEE_PT_SET",
      metadata: { employeeId: "emp-1", newValue: "200.00", actorId: "hr-1", actorRole: "HR", summary: "PT set to ₹200.00" },
    });
    expect(audits[0].metadata).not.toHaveProperty("oldValue");
  });

  it("EMPLOYEE_PT_UPDATED with old and new values", async () => {
    await auditProfessionalTax({ ...base, oldValue: "200", newValue: 250 });
    expect(audits[0]).toMatchObject({
      action: "EMPLOYEE_PT_UPDATED",
      metadata: { oldValue: "200.00", newValue: "250.00", summary: "PT ₹200.00 → ₹250.00" },
    });
  });

  it("writes nothing when the value does not change", async () => {
    await auditProfessionalTax({ ...base, oldValue: "200.00", newValue: 200 });
    await auditProfessionalTax({ ...base, oldValue: null, newValue: null });
    expect(audits).toEqual([]);
  });

  it("compares to the paisa and treats empty as not applicable", () => {
    expect(sameProfessionalTax("200.50", 200.5)).toBe(true);
    expect(sameProfessionalTax(null, "")).toBe(true);
    expect(sameProfessionalTax(null, 0)).toBe(false);
    expect(professionalTaxDiffSummary(null, 1234.5)).toBe("PT N/A → ₹1,234.50");
  });
});
