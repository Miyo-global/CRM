import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { getNavGroupsForRole, navHrefPath } from "./sidebar-nav-items";
import { ALL_ROLES, canAccess } from "@/lib/constants/roles";

/**
 * A9: the sidebar is built from the same access rules as the pages, so no role
 * is ever shown a link that renders "Access Restricted".
 */
function pageFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return pageFiles(full);
    return name === "page.tsx" ? [full] : [];
  });
}

function routeOf(file: string): string {
  const route = file
    .split(path.sep)
    .join("/")
    .replace(/^app/, "")
    .replace(/\/page\.tsx$/, "")
    .split("/")
    .filter((seg) => !/^\(.*\)$/.test(seg))
    .join("/");
  return route === "" ? "/" : route;
}

/** route -> roles listed in that page's DashboardGate, when it has one. */
const gatesByRoute = new Map<string, string[]>();
for (const file of pageFiles("app")) {
  const source = readFileSync(file, "utf8");
  const match = source.match(/allowedRoles=\{\[([^\]]*)\]\}/);
  if (!match) continue;
  const roles = [...match[1].matchAll(/"([A-Z_]+)"/g)].map((m) => m[1]);
  if (roles.length > 0) gatesByRoute.set(routeOf(file), roles);
}

describe("sidebar links are never gated against the role", () => {
  it("found the gated pages to check", () => {
    expect(gatesByRoute.size).toBeGreaterThan(5);
  });

  it.each(ALL_ROLES)("%s can open every link its sidebar shows", (role) => {
    const blocked = getNavGroupsForRole(role)
      .flatMap((group) => group.routes.map((r) => navHrefPath(r.href)))
      .filter((href) => {
        const allowed = gatesByRoute.get(href);
        return allowed != null && !canAccess(role, allowed);
      });
    expect(blocked).toEqual([]);
  });

  it("lets ADMIN through every page gate", () => {
    for (const [route, allowed] of gatesByRoute) {
      expect(canAccess("ADMIN", allowed), route).toBe(true);
    }
  });
});
