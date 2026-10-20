"use client";

import Link from "next/link";
import { useMemo } from "react";

import { Card } from "@/components/ui/card";
import { useRoleNavGroups } from "@/components/layout/app-sidebar";
import { navHrefPath, type NavRoute } from "@/components/layout/sidebar/sidebar-nav-items";

const GROUP_OF: Record<string, string> = {
  "/settings/roles": "Access & security",
  "/settings/permissions": "Access & security",
  "/settings/audit-log": "Access & security",
  "/settings/webhooks": "Integrations",
  "/settings/ai": "Integrations",
};
const GROUP_ORDER = ["Workspace", "Access & security", "Integrations"];

/**
 * Compact grouped links to the workspace settings on /settings. They replace
 * the settings side nav that repeated the sidebar on every settings page
 * (QA-DES-03). Built from the role's own nav, so it never shows routes the
 * role can't open.
 */
export function SettingsIndexLinks() {
  const { navGroups } = useRoleNavGroups();

  const groups = useMemo(() => {
    const seen = new Set<string>();
    const byGroup = new Map<string, NavRoute[]>();
    for (const group of navGroups) {
      for (const route of group.routes) {
        const path = navHrefPath(route.href);
        if (!path.startsWith("/settings/") || seen.has(path)) continue;
        seen.add(path);
        const name = GROUP_OF[path] ?? "Workspace";
        byGroup.set(name, [...(byGroup.get(name) ?? []), route]);
      }
    }
    return GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => ({ name: g, routes: byGroup.get(g)! }));
  }, [navGroups]);

  if (groups.length === 0) return null;

  return (
    <Card className="p-4">
      <nav aria-label="Workspace settings" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map(({ name, routes }) => (
          <div key={name}>
            <h2 className="mb-1.5 px-2 text-2xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{name}</h2>
            <ul className="space-y-0.5">
              {routes.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex h-8 items-center gap-2 rounded-md px-2 text-sm text-foreground transition-colors hover:bg-accent focus-visible:focus-ring"
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </Card>
  );
}
