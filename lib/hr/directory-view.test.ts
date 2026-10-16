import { describe, expect, it } from "vitest";
import { toDirectoryEntry } from "./directory-view";

const row = {
  id: "u1",
  name: "Qa Alpha",
  designation: "Engineer",
  department: "Engineering",
  email: "qa.alpha@example.com",
  employeeId: "MIYO-021",
  reportingTo: "u9",
  joiningDate: "2026-01-05",
  monthlySalary: null,
  isActive: true,
  role: "SALES",
};

describe("employee directory projection (QA-0062)", () => {
  it("hides contact and reporting details from a colleague", () => {
    const entry = toDirectoryEntry(row, { id: "u2", role: "SALES" });
    expect(entry.name).toBe("Qa Alpha");
    expect(entry.designation).toBe("Engineer");
    expect("email" in entry).toBe(false);
    expect("employeeId" in entry).toBe(false);
    expect("reportingTo" in entry).toBe(false);
    expect("joiningDate" in entry).toBe(false);
  });

  it("keeps the full record for admins and for yourself", () => {
    expect(toDirectoryEntry(row, { id: "u9", role: "HR" })).toEqual(row);
    expect(toDirectoryEntry(row, { id: "u1", role: "SALES" })).toEqual(row);
  });
});
