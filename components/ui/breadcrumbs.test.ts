import { describe, expect, it } from "vitest";
import { buildBreadcrumbs } from "./breadcrumbs";

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
