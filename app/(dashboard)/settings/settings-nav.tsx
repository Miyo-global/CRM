"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { cn } from "@/lib/utils";
import { useRoleNavGroups } from "@/components/layout/app-sidebar";
import { getLongestMatchingNavPath, navHrefPath, type NavRoute } from "@/components/layout/sidebar/sidebar-nav-items";

/** Global settings nav (§8.7) built from the role's own nav, so it never shows routes the role can't open. */
export function SettingsNav() {
  const pathname = usePathname();
  const { navGroups } = useRoleNavGroups();

  const routes = useMemo(() => {
    const seen = new Set<string>();
    const out: NavRoute[] = [];
    for (const group of navGroups) {
      for (const route of group.routes) {
        const path = navHrefPath(route.href);
        if (!(path === "/settings" || path.startsWith("/settings/")) || seen.has(path)) continue;
        seen.add(path);
        out.push(route);
      }
    }
    return out;
  }, [navGroups]);

  if (routes.length < 2) return null;

  const active = getLongestMatchingNavPath(pathname, [{ label: "Settings", routes }]);

  return (
    <nav
      aria-label="Settings"
      className="shrink-0 border-b border-border px-4 sm:px-6 lg:sticky lg:top-[var(--page-sticky-top,0px)] lg:max-h-[calc(100dvh-var(--page-sticky-top,0px))] lg:w-56 lg:self-start lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-3 lg:py-6"
    >
      <p className="mb-2 hidden px-2 text-2xs font-semibold uppercase tracking-[0.08em] text-muted-foreground lg:block">
        Settings
      </p>
      <ul className="-mb-px flex gap-1 overflow-x-auto py-2 lg:mb-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:py-0">
        {routes.map(({ href, label, icon: Icon }) => {
          const isActive = active === navHrefPath(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-8 items-center gap-2 whitespace-nowrap rounded-md px-2.5 text-sm transition-colors focus-visible:focus-ring",
                  isActive
                    ? "bg-brand-soft font-medium text-brand-soft-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
