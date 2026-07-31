import { describe, expect, it } from "vitest";
import { buildBonusEmployeeOptions, groupBonusEmployeeOptionsByRole } from "./bonus-employee-options";
import type { Employee } from "@/types/hr";

function employee(overrides: Partial<Employee> & Pick<Employee, "id">): Employee {
  return {
    id: overrides.id,
    name: overrides.name ?? null,
    firstName: overrides.firstName ?? "Test",
    lastName: overrides.lastName ?? "User",
    email: overrides.email ?? `${overrides.id}@example.com`,
    role: overrides.role ?? "ENGINEERING",
    designation: overrides.designation ?? null,
    employeeId: overrides.employeeId ?? null,
    departmentId: overrides.departmentId ?? null,
    department: overrides.department ?? null,
    image: null,
    isActive: overrides.isActive ?? true,
    joiningDate: overrides.joiningDate ?? "2024-01-01",
    hasDashboardAccess: true,
    reportingTo: null,
    monthlySalary: null,
    bio: null,
    linkedinUrl: null,
    twitterUrl: null,
    githubUrl: null,
    websiteUrl: null,
    skills: null,
    phone: null,
  };
}

describe("buildBonusEmployeeOptions", () => {
  it("sorts by role, department, and joining date", () => {
    const options = buildBonusEmployeeOptions([
      employee({
        id: "b",
        role: "HR",
        department: { id: 2, name: "People" },
        joiningDate: "2023-06-01",
        firstName: "Beta",
        lastName: "Hr",
      }),
      employee({
        id: "a",
        role: "ENGINEERING",
        department: { id: 1, name: "Product" },
        joiningDate: "2022-01-01",
        firstName: "Alpha",
        lastName: "Eng",
      }),
    ]);

    expect(options.map((option) => option.value)).toEqual(["a", "b"]);
    expect(options[0]?.roleLabel).toBe("Engineering");
    expect(options[0]?.secondaryLabel).toBe("Product");
    expect(options[0]?.keywords).toContain("Alpha Eng");
  });

  it("formats joining date and role label", () => {
    const options = buildBonusEmployeeOptions([
      employee({
        id: "ceo",
        role: "CEO",
        joiningDate: "2024-01-15",
        firstName: "Vamsi",
        lastName: "",
        department: { id: 1, name: "Leadership" },
        designation: "Chief Executive Officer",
        employeeId: "EMP-001",
      }),
    ]);

    expect(options[0]?.roleLabel).toBe("CEO");
    expect(options[0]?.joiningLabel).toBe("15 Jan 2024");
    expect(options[0]?.department).toBe("Leadership");
    expect(options[0]?.secondaryLabel).toBe("Leadership");
    expect(options[0]?.employeeId).toBe("EMP-001");
  });

  it("uses role label as secondary text when department is missing", () => {
    const options = buildBonusEmployeeOptions([
      employee({
        id: "solo",
        role: "ENGINEERING",
        department: null,
        firstName: "Solo",
        lastName: "Dev",
      }),
    ]);

    expect(options[0]?.secondaryLabel).toBe("Engineering");
  });
});

describe("groupBonusEmployeeOptionsByRole", () => {
  it("groups sorted options by role while preserving order", () => {
    const options = buildBonusEmployeeOptions([
      employee({
        id: "eng-1",
        role: "ENGINEERING",
        department: { id: 1, name: "Product" },
        joiningDate: "2022-01-01",
        firstName: "Alpha",
        lastName: "Eng",
      }),
      employee({
        id: "hr-1",
        role: "HR",
        department: { id: 2, name: "People" },
        joiningDate: "2023-01-01",
        firstName: "Beta",
        lastName: "Hr",
      }),
      employee({
        id: "eng-2",
        role: "ENGINEERING",
        department: { id: 1, name: "Product" },
        joiningDate: "2023-06-01",
        firstName: "Gamma",
        lastName: "Eng",
      }),
    ]);

    const groups = groupBonusEmployeeOptionsByRole(options);
    expect(groups.map((g) => g.role)).toEqual(["ENGINEERING", "HR"]);
    expect(groups[0]?.options.map((o) => o.value)).toEqual(["eng-1", "eng-2"]);
    expect(groups[1]?.options.map((o) => o.value)).toEqual(["hr-1"]);
  });
});
