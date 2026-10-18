import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.fn();

vi.mock("@/lib/db", () => ({ db: { execute: (...a: unknown[]) => execute(...a) } }));
vi.mock("@/lib/constants/modules", () => ({ CRM_MODULE_ENABLED: false }));

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
  it("hides the CRM targets when the module is off", () => {
    expect(availableRecordLinkTargets(false)).toEqual([
      "project",
      "project_ticket",
      "hr_employee",
      "support_ticket",
    ]);
  });

  it("offers all seven when it is on", () => {
    expect(availableRecordLinkTargets(true)).toHaveLength(7);
  });
});

describe("checkRecordTarget", () => {
  it("refuses a crm target with the module off, with 400", async () => {
    await expect(checkRecordTarget("org-a", "crm_lead", "7", false)).resolves.toMatchObject({
      ok: false,
      status: 400,
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("allows a crm target when the module is on and the row exists", async () => {
    await expect(checkRecordTarget("org-a", "crm_lead", "7", true)).resolves.toEqual({ ok: true });
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
    expect(recordHref("crm_deal", "9")).toBe("/crm/deals/9");
  });

  it("narrows a string", () => {
    expect(isRecordLinkTarget("project")).toBe(true);
    expect(isRecordLinkTarget("nope")).toBe(false);
  });
});
