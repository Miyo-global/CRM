import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.fn();

vi.mock("@/lib/db", () => ({ db: { execute: (...a: unknown[]) => execute(...a) } }));

const {
  availableRecordLinkTargets,
  checkRecordTarget,
  isRecordLinkTarget,
  recordHref,
} = await import("./record-links");

beforeEach(() => {
  execute.mockReset();
  execute.mockResolvedValue([{ "?column?": 1 }]);
});

describe("availableRecordLinkTargets", () => {
  it("offers no sales (CRM lead, deal or contact) targets", () => {
    expect(availableRecordLinkTargets()).toEqual([
      "project",
      "project_ticket",
      "hr_employee",
      "support_ticket",
    ]);
  });
});

describe("checkRecordTarget", () => {
  it("refuses the removed CRM targets with 400", async () => {
    for (const type of ["crm_lead", "crm_deal", "crm_contact"]) {
      await expect(checkRecordTarget("org-a", type, "7")).resolves.toMatchObject({ ok: false, status: 400 });
    }
    expect(execute).not.toHaveBeenCalled();
  });

  it("answers 404 for a record that is not in this org", async () => {
    execute.mockResolvedValueOnce([]);
    await expect(checkRecordTarget("org-a", "project_ticket", "99")).resolves.toMatchObject({
      ok: false,
      status: 404,
    });
  });

  it("rejects an unknown target type and a non-numeric id", async () => {
    await expect(checkRecordTarget("org-a", "nonsense", "1")).resolves.toMatchObject({
      ok: false,
      status: 400,
    });
    await expect(checkRecordTarget("org-a", "project", "abc")).resolves.toMatchObject({
      ok: false,
      status: 400,
    });
  });

  it("checks an employee through organization_members, since there is no employees table", async () => {
    await expect(checkRecordTarget("org-a", "hr_employee", "user-1")).resolves.toEqual({ ok: true });
    const chunks = execute.mock.calls[0][0].queryChunks as Array<{ value?: unknown[] }>;
    const sql = chunks.flatMap((chunk) => chunk.value ?? []).join(" ");
    expect(sql).toContain("organization_members");
  });

  it("reads the driver's rows shape", async () => {
    execute.mockResolvedValueOnce({ rows: [] });
    await expect(checkRecordTarget("org-a", "project", "1")).resolves.toMatchObject({ ok: false });
  });
});

describe("recordHref and isRecordLinkTarget", () => {
  it("points at the record's page", () => {
    expect(recordHref("project", "4")).toBe("/projects/4");
    expect(recordHref("hr_employee", "u1")).toBe("/hr/employees/u1");
    expect(recordHref("support_ticket", "9")).toBe("/support/9");
  });

  it("narrows a string", () => {
    expect(isRecordLinkTarget("project")).toBe(true);
    expect(isRecordLinkTarget("nope")).toBe(false);
    expect(isRecordLinkTarget("crm_lead")).toBe(false);
  });
});
