import { describe, expect, it } from "vitest";
import {
  getActiveModule,
  getLongestMatchingNavPath,
  getModules,
  getNavGroupsForRole,
  moduleOfGroup,
  navHrefPath,
} from "./sidebar-nav-items";
import { ALL_ROLES } from "@/lib/constants/roles";

/**
 * B5: exactly one nav item is ever active, chosen by longest-prefix match, and
 * the module that owns the current page is the one the sidebar shows.
 */
const PATHS = [
  "/dashboard",
  "/hr",
  "/hr/reimbursements",
  "/hr/leaves",
  "/hr/payroll",
  "/hr/employees/skills-matrix",
  "/settings",
];

describe("sidebar active item", () => {
  it.each(ALL_ROLES)("highlights at most one item for %s", (role) => {
    const groups = getNavGroupsForRole(role);
    for (const pathname of PATHS) {
      const longest = getLongestMatchingNavPath(pathname, groups);
      const active = groups.flatMap((g) =>
        g.routes.filter((r) => navHrefPath(r.href) === longest),
      );
      expect(active.length).toBeLessThanOrEqual(1);
    }
  });

  it("keeps Reimbursements off the Employees entry", () => {
    const groups = getNavGroupsForRole("HR");
    expect(getLongestMatchingNavPath("/hr/reimbursements", groups)).toBe("/hr/reimbursements");
    expect(getLongestMatchingNavPath("/hr", groups)).toBe("/hr");
  });

  it("puts every group of a module under one top-nav entry", () => {
    const groups = getNavGroupsForRole("HR");
    const modules = getModules(groups);
    expect(modules.map((m) => m.label)).toEqual([...new Set(modules.map((m) => m.label))]);
    for (const group of groups) {
      const owner = modules.find((m) => m.groupLabels.includes(group.label));
      expect(owner?.label).toBe(moduleOfGroup(group.label));
    }
  });

  it("resolves the module that owns a page", () => {
    const groups = getNavGroupsForRole("HR");
    const module = getActiveModule("/hr/reimbursements", groups);
    expect(module).not.toBeNull();
    const owning = groups.find((g) =>
      g.routes.some((r) => navHrefPath(r.href) === "/hr/reimbursements"),
    );
    expect(module).toBe(moduleOfGroup(owning!.label));
  });
});
