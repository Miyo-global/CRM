import { describe, expect, it } from "vitest";
import { getNavGroupsForRole } from "./sidebar-nav-items";
import { canAccessRoute } from "@/lib/auth/route-access";
import { ALL_ROLES } from "@/lib/constants/roles";

const hrefs = (role: string) =>
  getNavGroupsForRole(role).flatMap((g) => g.routes.map((r) => r.href.split("?")[0]));

describe("sidebar navigation", () => {
  it("returns nothing without a role", () => {
    expect(getNavGroupsForRole(undefined)).toEqual([]);
  });

  it.each(ALL_ROLES)("never links %s to a page the route map denies", (role) => {
    const denied = hrefs(role).filter((href) => !canAccessRoute(href, role));
    expect(denied).toEqual([]);
  });

  it("gives ADMIN the HR, settings and billing areas", () => {
    const links = hrefs("ADMIN");
    for (const path of ["/hr", "/hr/payroll", "/billing"]) expect(links).toContain(path);
    expect(links.some((l) => l.startsWith("/settings"))).toBe(true);
  });
});
