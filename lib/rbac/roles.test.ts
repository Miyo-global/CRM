import { describe, expect, it } from "vitest";
import {
  ASSIGNABLE_ROLE_OPTIONS,
  filterAssignableOrgRoles,
  getRoleLabel,
} from "./roles";
import { ROLE_DEFAULT_PERMISSIONS } from "./permissions";
import { getNavGroupsForRole } from "@/components/layout/sidebar/sidebar-nav-items";

describe("QA-ROLE-01: Super Admin, Admin and Employee", () => {
  it("offers Admin, HR and Employee, never Super Admin or a job title", () => {
    const offered = ASSIGNABLE_ROLE_OPTIONS.map((option) => option.value);
    expect(offered).toEqual(expect.arrayContaining(["ADMIN", "HR", "EMPLOYEE"]));
    for (const retired of ["CEO", "SALES", "ENGINEERING", "DESIGN", "CUSTOMER_SUPPORT", "VIDEO_EDITOR", "DIGITAL_MARKETING"]) {
      expect(offered).not.toContain(retired);
    }
  });

  it("keeps custom org roles and drops retired system ones", () => {
    const rows = [{ slug: "CEO" }, { slug: "SALES" }, { slug: "EMPLOYEE" }, { slug: "QA_ROLE" }];
    expect(filterAssignableOrgRoles(rows).map((r) => r.slug)).toEqual(["EMPLOYEE", "QA_ROLE"]);
  });

  it("labels the owner's role Super Admin", () => {
    expect(getRoleLabel("CEO")).toBe("Super Admin");
    expect(getRoleLabel("EMPLOYEE")).toBe("Employee");
  });

  it("gives Employee what Engineering had, and the same menu", () => {
    expect(ROLE_DEFAULT_PERMISSIONS.EMPLOYEE).toEqual(ROLE_DEFAULT_PERMISSIONS.ENGINEERING);
    const hrefs = (role: string) => getNavGroupsForRole(role).flatMap((g) => g.routes.map((r) => r.href));
    expect(hrefs("EMPLOYEE")).toEqual(hrefs("ENGINEERING"));
  });
});
