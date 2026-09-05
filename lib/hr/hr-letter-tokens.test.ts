import { describe, expect, it } from "vitest";
import { applyHrLetterTokens, buildHrLetterVars } from "./hr-letter-tokens";

describe("applyHrLetterTokens", () => {
  const vars = { employeeName: "Ravi Kumar", designation: "Analyst" };

  it("substitutes known tokens", () => {
    expect(applyHrLetterTokens("Dear {{employeeName}},", vars)).toBe("Dear Ravi Kumar,");
  });

  it("ignores whitespace inside the braces", () => {
    expect(applyHrLetterTokens("{{ designation }}", vars)).toBe("Analyst");
  });

  it("does not leak inherited Object properties into a termination letter", () => {
    for (const key of ["toString", "constructor", "valueOf", "hasOwnProperty"]) {
      expect(applyHrLetterTokens(`Role: {{${key}}}`, vars)).toBe("Role: ");
    }
  });

  it("renders an unknown token as empty rather than leaving the braces visible", () => {
    // Defined behaviour, pinned deliberately: a typo'd token yields a gap in
    // the letter, not a literal "{{designaton}}" shown to the employee.
    expect(applyHrLetterTokens("Role: {{designaton}}.", vars)).toBe("Role: .");
  });

  it("does not re-interpret a substituted value as another token", () => {
    const hostile = { employeeName: "{{designation}}", designation: "Analyst" };
    expect(applyHrLetterTokens("{{employeeName}}", hostile)).toBe("{{designation}}");
  });
});

describe("buildHrLetterVars", () => {
  const employee = {
    firstName: "Ravi",
    lastName: "Kumar",
    employeeId: "MG-007",
    designation: "Analyst",
    departmentName: "Finance",
    joiningDate: "2025-04-01",
  };

  it("composes the full name and passes extras through", () => {
    const vars = buildHrLetterVars(
      employee,
      { name: "Miyo Global" },
      new Date("2026-09-05T00:00:00"),
      { lastWorkingDay: "30 September 2026" },
    );

    expect(vars.employeeName).toBe("Ravi Kumar");
    expect(vars.orgName).toBe("Miyo Global");
    expect(vars.lastWorkingDay).toBe("30 September 2026");
    expect(vars.date).toBe("05 September 2026");
  });

  it("does not emit 'null' or 'undefined' text for missing optional fields", () => {
    const vars = buildHrLetterVars(
      { firstName: "Ravi", lastName: "Kumar" },
      { name: "Miyo Global" },
      new Date("2026-09-05T00:00:00"),
    );

    for (const [key, value] of Object.entries(vars)) {
      expect(value, `${key} must never render as null/undefined text`).not.toMatch(
        /null|undefined/,
      );
    }
  });
});
