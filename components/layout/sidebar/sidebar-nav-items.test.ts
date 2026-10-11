import { describe, expect, it } from "vitest";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";

function pageFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return pageFiles(full);
    return name === "page.tsx" ? [full] : [];
  });
}
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

  it("gives ADMIN the HR and settings areas", () => {
    const links = hrefs("ADMIN");
    for (const path of ["/hr", "/hr/payroll", "/settings"]) expect(links).toContain(path);
    expect(links.some((l) => l.startsWith("/settings"))).toBe(true);
  });
});

describe("sidebar links point at real pages", () => {
  const pages = new Set(
    pageFiles("app").map((f) => {
      const route = f
        .split(path.sep)
        .join("/")
        .replace(/^app/, "")
        .replace(/\/page\.tsx$/, "")
        .split("/")
        .filter((seg) => !/^\(.*\)$/.test(seg))
        .join("/");
      const base = route.replace(/\/\[\[\.\.\.[^\]]+\]\]$/, "");
      return base === "" ? "/" : base;
    }),
  );

  it.each(ALL_ROLES)("every %s link resolves to a page", (role) => {
    const missing = hrefs(role).filter((href) => !pages.has(href));
    expect(missing).toEqual([]);
  });
});
