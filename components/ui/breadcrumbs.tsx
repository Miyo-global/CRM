"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ALL_ROLES } from "@/lib/constants/roles";
import { getNavGroupsForRole, navHrefPath } from "@/components/layout/sidebar/sidebar-nav-items";

export interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null;
  const last = items.length - 1;
  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
        {items.map((item, i) => {
          const isLast = i === last;
          // Middle items collapse to an ellipsis below md.
          const isMiddle = i > 0 && !isLast;
          return (
            <React.Fragment key={`${item.href ?? item.label}-${i}`}>
              {i === 1 && items.length > 2 && (
                <li aria-hidden="true" className="flex items-center gap-1 md:hidden">
                  <span>…</span>
                  <ChevronRight className="size-3 shrink-0" />
                </li>
              )}
              <li className={cn("flex min-w-0 items-center gap-1", isMiddle && "hidden md:flex")}>
                {isLast ? (
                  <span aria-current="page" className="truncate font-medium text-foreground">
                    {item.label}
                  </span>
                ) : item.href ? (
                  <Link
                    href={item.href}
                    className="truncate rounded-sm transition-colors hover:text-foreground focus-visible:focus-ring"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="truncate">{item.label}</span>
                )}
                {!isLast && <ChevronRight aria-hidden="true" className="size-3 shrink-0" />}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

// ponytail: labels come from the union of every role's nav (first label wins); pass `role`-specific crumbs explicitly if they ever diverge.
let navLabels: Map<string, string> | null = null;
function getNavLabels(): Map<string, string> {
  if (navLabels) return navLabels;
  navLabels = new Map();
  for (const role of ALL_ROLES) {
    for (const group of getNavGroupsForRole(role)) {
      for (const route of group.routes) {
        const path = navHrefPath(route.href);
        if (!navLabels.has(path)) navLabels.set(path, route.label);
      }
    }
  }
  return navLabels;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** UUIDs, numeric ids, and long opaque ids (cuid/nanoid) render as "Details". */
export function isIdSegment(segment: string): boolean {
  return UUID_RE.test(segment) || /^\d+$/.test(segment) || (segment.length >= 20 && /\d/.test(segment) && /^[\w-]+$/.test(segment));
}

function titleCase(segment: string): string {
  return decodeURIComponent(segment)
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Section roots whose nav entry names one page, not the section: /hr is the
 * "Employees" item, so every HR page read "Employees > Leaves" (R2-HR-01).
 * Used only when the root is a parent crumb.
 */
const SECTION_LABELS: Record<string, string> = { "/hr": "HR" };

/** Crumbs for a pathname: nav label when the prefix is a nav route, else title-cased segment. */
export function buildBreadcrumbs(pathname: string, labels: Map<string, string> = getNavLabels()): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((segment, i) => {
    const href = `/${segments.slice(0, i + 1).join("/")}`;
    const section = i < segments.length - 1 ? SECTION_LABELS[href] : undefined;
    const label = section ?? labels.get(href) ?? (isIdSegment(segment) ? "Details" : titleCase(segment));
    return i === segments.length - 1 ? { label } : { label, href };
  });
  // Collapse adjacent duplicates (e.g. /hr "Employees" → /hr/employees): keep the nav parent, or the current page if last.
  const last = crumbs.length - 1;
  return crumbs.filter((c, i) =>
    i === last ? true : i === last - 1 && c.label === crumbs[last].label ? false : i === 0 || c.label !== crumbs[i - 1].label,
  );
}

export function useAutoBreadcrumbs(): Crumb[] {
  const pathname = usePathname();
  return React.useMemo(() => buildBreadcrumbs(pathname ?? "/"), [pathname]);
}
