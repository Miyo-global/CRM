import { describe, expect, it } from "vitest";
import { readdirSync } from "fs";
import { join } from "path";
import { ADMIN_SETTINGS_PAGES, HR_SETTINGS_PAGES, ORG_ADMIN_SETTINGS_PAGES, canAccessRoute, isDisabledModuleRoute } from "./route-access";
import { getNavGroupsForRole } from "@/components/layout/sidebar/sidebar-nav-items";
import { SYSTEM_ROLES } from "@/lib/rbac/permissions";
import { ROLE_LABELS } from "@/lib/rbac/roles";
import { ALL_ROLES } from "@/lib/constants/roles";

describe("canAccessRoute", () => {
  it("denies ENGINEERING on HR and settings", () => {
    for (const path of ["/hr", "/hr/payroll", "/hr/employees", "/settings/members"]) {
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
    expect(canAccessRoute("/hr/payroll", "ENGINEERING")).toBe(false);
  });

  it("lets ADMIN into admin areas", () => {
    for (const path of ["/hr", "/hr/payroll", "/hr/employees", "/settings", "/settings/roles"]) {
      expect(canAccessRoute(path, "ADMIN")).toBe(true);
    }
  });

  it("keeps admin dashboards away from non-admin roles but leaves /dashboard open", () => {
    expect(canAccessRoute("/dashboard/admin-health", "ENGINEERING")).toBe(false);
    expect(canAccessRoute("/dashboard/admin-health", "ADMIN")).toBe(true);
    expect(canAccessRoute("/dashboard", "ENGINEERING")).toBe(true);
  });

  it("lets every role reach notifications", () => {
    for (const role of ["EMPLOYEE", "ENGINEERING"]) {
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

describe("settings and onboarding access (MIYO-0024, MIYO-0025)", () => {
  it("every employee can open their own account settings and onboarding tasks", () => {
    expect(canAccessRoute("/settings", "ENGINEERING")).toBe(true);
    expect(canAccessRoute("/settings/notifications", "ENGINEERING")).toBe(true);
    expect(canAccessRoute("/hr/onboarding/my-tasks", "ENGINEERING")).toBe(true);
    expect(canAccessRoute("/hr/onboarding", "ENGINEERING")).toBe(false);
  });

  it("admin settings pages are closed to ordinary employees", () => {
    for (const page of ADMIN_SETTINGS_PAGES) {
      expect(canAccessRoute(`/settings/${page}`, "ENGINEERING")).toBe(false);
    }
  });

  it("HR manages its own settings pages but not the org-admin ones (QA-0034)", () => {
    for (const page of HR_SETTINGS_PAGES) {
      expect(canAccessRoute(`/settings/${page}`, "HR")).toBe(true);
    }
    for (const page of ORG_ADMIN_SETTINGS_PAGES) {
      expect(canAccessRoute(`/settings/${page}`, "HR")).toBe(false);
      expect(canAccessRoute(`/settings/${page}`, "ADMIN")).toBe(true);
      expect(canAccessRoute(`/settings/${page}`, "CEO")).toBe(true);
    }
  });

  it("every settings page folder is classified (new admin pages must be listed)", () => {
    const dir = join(process.cwd(), "app/(dashboard)/settings");
    const personal = new Set(["[[...rest]]", "notifications"]);
    const pages = readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !personal.has(d.name))
      .map((d) => d.name);
    for (const page of pages) expect(ADMIN_SETTINGS_PAGES).toContain(page);
  });
});

describe("previously unmapped pages (QA-0065)", () => {
  it("keeps manager and HR pages away from a low-privilege role", () => {
    for (const path of [
      "/reports",
      "/portal",
      "/tasks/overdue",
      "/timesheets/team",
      "/hr/leaves/policies",
    ]) {
      expect(canAccessRoute(path, "EMPLOYEE")).toBe(false);
    }
  });

  it("opens the published handbook to every role but keeps /hr closed", () => {
    expect(canAccessRoute("/hr/handbook", "EMPLOYEE")).toBe(true);
    expect(canAccessRoute("/hr", "EMPLOYEE")).toBe(false);
  });

  it("still lets everyone open their own leave and timesheets", () => {
    expect(canAccessRoute("/hr/leaves", "EMPLOYEE")).toBe(true);
    expect(canAccessRoute("/timesheets", "EMPLOYEE")).toBe(true);
  });

  it("lets HR open the policy editor and the team views", () => {
    expect(canAccessRoute("/hr/leaves/policies", "HR")).toBe(true);
    expect(canAccessRoute("/timesheets/team", "HR")).toBe(true);
    expect(canAccessRoute("/reports", "HR")).toBe(true);
  });
});

describe("knowledge routes (KB-0008)", () => {
  it("opens the wiki to every system role", () => {
    for (const role of SYSTEM_ROLES) {
      expect(canAccessRoute("/knowledge", role), role).toBe(true);
      expect(canAccessRoute("/knowledge/wiki/doc/abc", role), role).toBe(true);
      expect(canAccessRoute("/knowledge/chat", role), role).toBe(true);
    }
  });

  it("keeps analytics and content health off an employee role", () => {
    for (const path of ["/knowledge/wiki/analytics", "/knowledge/wiki/manage"]) {
      expect(canAccessRoute(path, "ENGINEERING"), path).toBe(false);
      expect(canAccessRoute(path, "HR"), path).toBe(true);
      expect(canAccessRoute(path, "CEO"), path).toBe(true);
    }
  });

  it("opens import/export to an employee role, which holds kb:pages:export", () => {
    expect(canAccessRoute("/knowledge/wiki/import", "ENGINEERING")).toBe(true);
    expect(canAccessRoute("/knowledge/wiki/search", "ENGINEERING")).toBe(true);
  });

  it("does not match a sibling prefix", () => {
    expect(canAccessRoute("/knowledgex", "ENGINEERING")).toBe(true);
  });
});

describe("own employee record (QA-AUTH-09)", () => {
  it("opens only your own record page, not someone else's or its sub-routes", async () => {
    const { isOwnEmployeeRecord } = await import("./route-access");
    expect(isOwnEmployeeRecord("/hr/employees/u1", "u1")).toBe(true);
    expect(isOwnEmployeeRecord("/hr/employees/u1/", "u1")).toBe(true);
    expect(isOwnEmployeeRecord("/hr/employees/u2", "u1")).toBe(false);
    expect(isOwnEmployeeRecord("/hr/employees/u1/edit", "u1")).toBe(false);
    expect(isOwnEmployeeRecord("/hr/employees/u1", undefined)).toBe(false);
  });
});

describe("HR is kept out of Organization, Data Export and System Health", () => {
  const ORG_ONLY = ["/settings/organization", "/settings/data-hub", "/dashboard/admin-health"];

  it.each([
    ["CEO", true],
    ["ADMIN", true],
    ["HR", false],
    ["EMPLOYEE", false],
  ])("%s reaching the org-wide pages: %s", (role, allowed) => {
    for (const path of ORG_ONLY) expect(canAccessRoute(path, role)).toBe(allowed);
  });

  it("HR keeps Members", () => {
    expect(canAccessRoute("/settings/members", "HR")).toBe(true);
  });

  it("the HR menu does not link them, the admin menu does", () => {
    const hrefs = (role: string) =>
      getNavGroupsForRole(role).flatMap((g) => g.routes.map((r) => r.href));
    for (const path of ORG_ONLY) expect(hrefs("HR")).not.toContain(path);
    expect(hrefs("HR")).toContain("/settings/members");
    expect(hrefs("ADMIN")).toEqual(expect.arrayContaining(ORG_ONLY));
  });
});

describe("isDisabledModuleRoute (ATS off)", () => {
  it("turns every ATS page and API away while the module is off", () => {
    for (const path of ["/ats", "/ats/jobs/1", "/api/ats", "/api/ats/candidates", "/api/public/ats/apply"]) {
      expect(isDisabledModuleRoute(path, false)).toBe(true);
      expect(isDisabledModuleRoute(path, true)).toBe(false);
    }
  });

  it("leaves look-alike paths alone", () => {
    for (const path of ["/atsx", "/api/atsx", "/hr", "/api/hr/employees"]) {
      expect(isDisabledModuleRoute(path, false)).toBe(false);
    }
  });
});

describe("Customer Support module (owner decision)", () => {
  it("is for support staff, not employees", () => {
    for (const path of ["/support", "/support/inbox", "/support/42"]) {
      expect(canAccessRoute(path, "EMPLOYEE")).toBe(false);
      expect(canAccessRoute(path, "HR")).toBe(true);
      expect(canAccessRoute(path, "ADMIN")).toBe(true);
      expect(canAccessRoute(path, "CUSTOMER_SUPPORT")).toBe(true);
    }
    expect(canAccessRoute("/hr/helpdesk", "EMPLOYEE")).toBe(true);
  });
});
