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

describe("KB-0065: the Knowledge module in the nav", () => {
  it.each(ALL_ROLES)("gives %s the wiki", (role) => {
    const groups = getNavGroupsForRole(role).map((g) => g.label);
    expect(groups).toContain("Knowledge – Wiki");
    expect(hrefs(role)).toContain("/knowledge/wiki");
  });

  it("puts the wiki straight after Core, not at the bottom", () => {
    const groups = getNavGroupsForRole("HR").map((g) => g.label);
    expect(groups[0]).toBe("Core");
    expect(groups[1]).toBe("Knowledge – Wiki");
  });

  it("gives HR the manage group", () => {
    const groups = getNavGroupsForRole("HR").map((g) => g.label);
    expect(groups).toContain("Knowledge – Manage");
    expect(hrefs("HR")).toContain("/knowledge/wiki/reviews");
  });

  it("does not offer an Employee import and export, which it cannot do", () => {
    expect(hrefs("EMPLOYEE")).not.toContain("/knowledge/wiki/import");
    // It still sees the reviews queue, which every employee may read.
    expect(hrefs("EMPLOYEE")).toContain("/knowledge/wiki/reviews");
  });

  it("never links a role to a knowledge page the route map denies it", () => {
    for (const role of ALL_ROLES) {
      const denied = hrefs(role)
        .filter((href) => href.startsWith("/knowledge"))
        .filter((href) => !canAccessRoute(href, role));
      expect(denied).toEqual([]);
    }
  });
});

describe("My Support Tickets (FR1-032)", () => {
  it("opens the employee's own HR helpdesk tickets, listed once", async () => {
    const { getNavGroupsForRole } = await import("./sidebar-nav-items");
    const routes = getNavGroupsForRole("EMPLOYEE").flatMap((g) => g.routes);
    const tickets = routes.filter((r) => r.label === "My Support Tickets");
    expect(tickets.map((r) => r.href)).toEqual(["/hr/helpdesk"]);
    expect(routes.filter((r) => r.href === "/hr/helpdesk")).toHaveLength(1);
    expect(routes.some((r) => r.href === "/support/inbox")).toBe(false);
  });
});

describe("Customer Support top-nav module (P2-support-not-in-top-nav)", () => {
  it("highlights Customer Support, not HR, on /support pages", async () => {
    const { getActiveModule } = await import("./sidebar-nav-items");
    for (const role of ["CEO", "ADMIN", "HR"]) {
      const groups = getNavGroupsForRole(role);
      expect(getActiveModule("/support", groups)).toBe("Customer Support");
      expect(getActiveModule("/support/inbox", groups)).toBe("Customer Support");
    }
  });
});
