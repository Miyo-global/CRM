import { describe, expect, it } from "vitest";
import { buildBreadcrumbs, crumbsForRole } from "./breadcrumbs";

const labels = new Map([
  ["/hr", "Employees"],
  ["/hr/leaves", "Leaves"],
  ["/hr/payroll", "Payroll"],
]);

describe("R2-HR-01: HR breadcrumbs", () => {
  it("names the HR section as the parent, not Employees", () => {
    expect(buildBreadcrumbs("/hr/leaves", labels)).toEqual([{ label: "HR", href: "/hr" }, { label: "Leaves" }]);
    expect(buildBreadcrumbs("/hr/payroll", labels)).toEqual([{ label: "HR", href: "/hr" }, { label: "Payroll" }]);
  });

  it("keeps the Employees label on /hr itself", () => {
    expect(buildBreadcrumbs("/hr", labels)).toEqual([{ label: "Employees" }]);
  });
});

describe("R3-EMP-08: crumbs a role cannot open", () => {
  const crumbs = [{ label: "My HR", href: "/hr" }, { label: "Leaves" }];

  it("sends an employee's HR root to /hr/leaves", () => {
    expect(crumbsForRole(crumbs, "EMPLOYEE")[0]).toEqual({ label: "My HR", href: "/hr/leaves" });
  });

  it("keeps /hr for the people team", () => {
    expect(crumbsForRole(crumbs, "HR")[0].href).toBe("/hr");
  });

  it("unlinks a disallowed crumb with no fallback", () => {
    expect(crumbsForRole([{ label: "Payroll", href: "/hr/payroll" }, { label: "x" }], "EMPLOYEE")[0]).toEqual({ label: "Payroll" });
  });
});
