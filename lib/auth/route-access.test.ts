import { describe, expect, it } from "vitest";
import { canAccessRoute } from "./route-access";
import { SYSTEM_ROLES } from "@/lib/rbac/permissions";
import { ROLE_LABELS } from "@/lib/rbac/roles";
import { ALL_ROLES } from "@/lib/constants/roles";

describe("canAccessRoute", () => {
  it("denies ENGINEERING on HR and settings", () => {
    for (const path of ["/hr", "/hr/payroll", "/hr/employees", "/settings"]) {
      expect(canAccessRoute(path, "ENGINEERING")).toBe(false);
    }
  });

  it("denies an unknown role on mapped routes", () => {
    expect(canAccessRoute("/hr/payroll", "NOT_A_ROLE")).toBe(false);
  });

  it("does not match a sibling prefix", () => {
    expect(canAccessRoute("/hrx", "ENGINEERING")).toBe(true);
    expect(canAccessRoute("/hr-tools", "ENGINEERING")).toBe(true);
  });

  it("uses the longest matching prefix", () => {
    expect(canAccessRoute("/hr/leaves", "ENGINEERING")).toBe(true);
    expect(canAccessRoute("/hr/payroll", "BRANCH_MANAGER")).toBe(false);
  });

  it("lets ADMIN into admin areas", () => {
    for (const path of ["/hr", "/hr/payroll", "/hr/employees", "/settings", "/settings/roles"]) {
      expect(canAccessRoute(path, "ADMIN")).toBe(true);
    }
  });

  it("keeps admin dashboards away from non-admin roles but leaves /dashboard open", () => {
    expect(canAccessRoute("/dashboard/admin-health", "ENGINEERING")).toBe(false);
    expect(canAccessRoute("/dashboard/branches", "SALES")).toBe(false);
    expect(canAccessRoute("/dashboard/admin-health", "ADMIN")).toBe(true);
    expect(canAccessRoute("/dashboard", "ENGINEERING")).toBe(true);
  });

  it("lets every role reach notifications", () => {
    for (const role of ["SALES", "ENGINEERING", "BRANCH_MANAGER", "BRANCH_HR"]) {
      expect(canAccessRoute("/notifications", role)).toBe(true);
    }
  });

  it("lets CEO and HR into HR pages", () => {
    expect(canAccessRoute("/hr/payroll", "CEO")).toBe(true);
    expect(canAccessRoute("/hr/payroll", "HR")).toBe(true);
  });
});

describe("role catalog", () => {
  it("SYSTEM_ROLES covers every role in ROLES", () => {
    expect([...SYSTEM_ROLES].sort()).toEqual([...ALL_ROLES].sort());
  });

  it("every system role has a label", () => {
    for (const role of SYSTEM_ROLES) expect(ROLE_LABELS[role]).toBeTruthy();
  });
});
