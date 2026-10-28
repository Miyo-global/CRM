import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ALL_ROLES } from "@/lib/constants/roles";
import { getNavGroupsForRole, navHrefPath } from "@/components/layout/sidebar/sidebar-nav-items";
import { buildBreadcrumbs } from "@/components/ui/breadcrumbs";

/**
 * R3-INV-03: every sidebar link and every breadcrumb parent must be a real
 * app route. /tools and /projects/<id>/tickets were linked (and prefetched)
 * but had no page, so they 404'd.
 */
const APP_DIR = path.resolve(__dirname, "../../app");

/** URL patterns ("/projects/[projectId]") of every page.tsx / route.ts outside app/api. */
function appRoutes(dir = APP_DIR, segments: string[] = []): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "api" && segments.length === 0) continue;
      // Parallel slots (@panel) and intercepting routes ((.)x) are not URLs of their own.
      if (name.startsWith("@") || name.startsWith("(.")) continue;
      // Route groups ((dashboard)) add no URL segment.
      const isGroup = name.startsWith("(") && name.endsWith(")");
      out.push(...appRoutes(full, isGroup ? segments : [...segments, name]));
    } else if (/^(page|route)\.(tsx?|jsx?)$/.test(name)) {
      out.push(`/${segments.join("/")}`);
    }
  }
  return out;
}

function toMatcher(route: string): RegExp {
  const body = route
    .split("/")
    .filter(Boolean)
    .map((seg) => {
      // An optional catch-all is matched only at its root: the settings one
      // 404s every child path.
      if (/^\[\[\.\.\..+\]\]$/.test(seg)) return "";
      if (/^\[\.\.\..+\]$/.test(seg)) return "/.+";
      if (/^\[.+\]$/.test(seg)) return "/[^/]+";
      return `/${seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`;
    })
    .join("");
  return new RegExp(`^${body || "/"}$`);
}

const routes = appRoutes();
const matchers = routes.map(toMatcher);
const isRoute = (href: string) => matchers.some((m) => m.test(navHrefPath(href) || "/"));

describe("R3-INV-03: links point at existing routes", () => {
  it("finds the app routes", () => {
    expect(routes).toContain("/dashboard");
    expect(routes).toContain("/projects/[projectId]");
  });

  it("every sidebar href, for every role, is an app route", () => {
    const missing = new Set<string>();
    for (const role of ALL_ROLES) {
      for (const group of getNavGroupsForRole(role)) {
        for (const route of group.routes) {
          if (route.href.startsWith("/") && !isRoute(route.href)) missing.add(`${role}: ${route.href}`);
        }
      }
    }
    expect([...missing]).toEqual([]);
  });

  it("every breadcrumb parent of every signed-in page is an app route", () => {
    const missing = new Set<string>();
    // Breadcrumbs render in the (dashboard) shell only.
    for (const route of appRoutes(path.join(APP_DIR, "(dashboard)"))) {
      const sample = route
        .split("/")
        .filter((seg) => !/^\[\[\.\.\..+\]\]$/.test(seg))
        .map((seg) => (/^\[.+\]$/.test(seg) ? "1" : seg))
        .join("/");
      for (const crumb of buildBreadcrumbs(sample || "/")) {
        if (crumb.href && !isRoute(crumb.href)) missing.add(`${crumb.href} (from ${route})`);
      }
    }
    expect([...missing]).toEqual([]);
  });

  it("every next.config redirect lands on an app route and shadows no static page", async () => {
    const { default: nextConfig } = await import("@/next.config");
    const redirects = (await nextConfig.redirects?.()) ?? [];
    const staticRoutes = new Set(routes.filter((r) => !r.includes("[")));
    const bad = redirects
      .filter((r) => !r.source.includes(":"))
      .flatMap((r) => [
        ...(isRoute(r.destination) ? [] : [`${r.source} -> ${r.destination} (no such page)`]),
        ...(staticRoutes.has(r.source) ? [`${r.source} (is a real page)`] : []),
      ]);
    expect(bad).toEqual([]);
  });

  it("has pages for the two parents QA saw 404", () => {
    expect(isRoute("/tools")).toBe(true);
    expect(isRoute("/projects/1/tickets")).toBe(true);
  });
});
