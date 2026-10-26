import { describe, expect, it, vi } from "vitest";
import { blocksNewTermination, terminationDateError, terminationEmailNotice } from "./termination-rules";
import { fnfHasFigures, fnfTotals } from "./fnf-figures";
vi.mock("@/lib/db", () => ({ db: {} }));
import { diffFields } from "@/lib/audit-log";

describe("terminationDateError (R3-ADM-02)", () => {
  const today = "2026-10-24";
  it.each([
    ["2026-10-24", false, null],
    ["2027-10-24", false, null],
    ["2026-10-23", false, "Effective date cannot be in the past. Only the Super Admin can backdate a termination."],
    ["2026-10-01", true, null],
    ["2027-10-25", false, "Effective date can be at most one year from today."],
    ["2099-12-31", true, "Effective date can be at most one year from today."],
    ["2026-02-30", false, "Effective date must be a valid date."],
  ])("%s (backdate=%s)", (date, canBackdate, expected) => {
    expect(terminationDateError(date, { canBackdate, today })).toBe(expected);
  });
});

describe("blocksNewTermination (R3-ADM-07)", () => {
  const today = "2026-10-24";
  it.each([
    ["DRAFT", "2026-11-01", true],
    ["PENDING_CEO", "2026-11-01", true],
    ["APPROVED", "2026-11-01", true],
    ["SENT", "2026-11-01", true],
    ["REJECTED", "2026-11-01", false],
    ["CANCELLED", "2026-11-01", false],
    ["COMPLETED", "2026-11-01", true], // completed, account closes later
    ["COMPLETED", "2025-01-01", false], // old exit, person re-hired since
  ])("%s effective %s -> %s", (status, effectiveDate, blocked) => {
    expect(blocksNewTermination({ status, effectiveDate }, today)).toBe(blocked);
  });
});

describe("fnf figures (R3-SA-04)", () => {
  it("an auto-created draft has no figures", () => {
    const empty = { basicDues: "0", leaveEncashment: "0", bonusDue: "0", deductions: "0", loanRecovery: "0" };
    expect(fnfHasFigures(empty)).toBe(false);
  });
  it("totals gross, deductions and net", () => {
    const f = { basicDues: "50000", leaveEncashment: "8000", bonusDue: null, deductions: "2000", loanRecovery: "1000" };
    expect(fnfTotals(f)).toEqual({ gross: 58000, deductions: 3000, net: 55000 });
    expect(fnfHasFigures(f)).toBe(true);
  });
});

describe("diffFields (R3-ADM-12)", () => {
  it("keeps only changed fields, with old and new values", () => {
    expect(diffFields({ name: "Old", slug: "acme" }, { name: "New", slug: "acme" })).toEqual({
      name: { from: "Old", to: "New" },
    });
  });
  it("ignores undefined input and redacts secrets", () => {
    expect(diffFields({ url: "a", secret: "s1" }, { url: undefined, secret: "s2" })).toEqual({
      secret: { from: "[redacted]", to: "[redacted]" },
    });
  });
});

describe("effective date before joining (FR1-015)", () => {
  it("is refused, even for a Super Admin who may backdate", async () => {
    const { terminationDateError } = await import("./termination-rules");
    const opts = { canBackdate: true, today: "2026-10-26", joiningDate: "2026-10-26" };
    expect(terminationDateError("2026-10-20", opts)).toBe(
      "Effective date cannot be before the joining date (26 Oct 2026).",
    );
    expect(terminationDateError("2026-10-26", opts)).toBeNull();
    expect(terminationDateError("2026-10-20", { ...opts, joiningDate: null })).toBeNull();
  });
});

describe("terminationFormErrors (FR1-016)", () => {
  const base = {
    employeeId: "e1",
    employeeIsSuperAdmin: false,
    actorId: "hr1",
    reasons: ["Misconduct"],
    explanation: "x".repeat(60),
    otherSelected: false,
    effectiveDate: "2026-11-30",
    canBackdate: false,
    today: "2026-10-26",
    joiningDate: "2026-01-01",
  };

  it("lists every problem of an empty form, by field", async () => {
    const { terminationFormErrors } = await import("./termination-rules");
    const errors = terminationFormErrors({ ...base, employeeId: null, reasons: [], explanation: "", effectiveDate: "" });
    expect(Object.keys(errors).sort()).toEqual(["effectiveDate", "employee", "explanation", "reasons"]);
  });

  it("is empty for a valid form and flags a date before joining", async () => {
    const { terminationFormErrors } = await import("./termination-rules");
    expect(terminationFormErrors(base)).toEqual({});
    expect(terminationFormErrors({ ...base, canBackdate: true, effectiveDate: "2025-12-01" }).effectiveDate).toMatch(
      /before the joining date/,
    );
  });
});

describe("terminationEmailNotice (FR1-036)", () => {
  it("says a future-dated employee is notified now and stays active until the effective date", () => {
    const text = terminationEmailNotice("QA-TEST Emp2", "2026-11-30", "2026-10-26");
    expect(text).toContain("notified now");
    expect(text).toContain("stay active until the effective date, 30 Nov 2026");
  });

  it("keeps the plain wording when the effective date has come", () => {
    expect(terminationEmailNotice(null, "2026-10-26", "2026-10-26")).toMatch(
      /^Send termination email to this employee\?.*mark the termination as Complete\.$/,
    );
  });
});
