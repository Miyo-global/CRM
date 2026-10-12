import { describe, expect, it } from "vitest";
import { canViewSalaryOf, redactSalary } from "./redact-salary";

const row = { id: "u2", monthlySalary: "250000", name: "CEO" };

describe("redactSalary", () => {
  it("hides a coworker's salary from non-admin roles", () => {
    for (const role of ["ENGINEERING", "SALES", "DESIGN", "CUSTOMER_SUPPORT"]) {
      expect(redactSalary(row, { id: "u1", role }).monthlySalary).toBeNull();
    }
  });

  it("hides salary when the viewer has no role", () => {
    expect(redactSalary(row, { id: "u1", role: null }).monthlySalary).toBeNull();
    expect(redactSalary(row, { id: "u1" }).monthlySalary).toBeNull();
  });

  it("keeps the other fields when redacting", () => {
    expect(redactSalary(row, { id: "u1", role: "ENGINEERING" })).toEqual({ ...row, monthlySalary: null });
  });

  it("does not mutate the input row", () => {
    redactSalary(row, { id: "u1", role: "ENGINEERING" });
    expect(row.monthlySalary).toBe("250000");
  });

  it("shows an employee their own salary", () => {
    expect(redactSalary(row, { id: "u2", role: "ENGINEERING" }).monthlySalary).toBe("250000");
  });

  it("shows salary to CEO, HR and ADMIN", () => {
    for (const role of ["CEO", "HR", "ADMIN"]) {
      expect(canViewSalaryOf({ id: "u1", role }, "u2")).toBe(true);
      expect(redactSalary(row, { id: "u1", role }).monthlySalary).toBe("250000");
    }
  });
});
