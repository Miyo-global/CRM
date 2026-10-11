"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { NavGroup } from "./sidebar-nav-items";
import { navHrefPath } from "./sidebar-nav-items";

interface SidebarSectionProps {
  group: NavGroup;
  groupIndex: number;
  isCollapsed: boolean;
  isGroupCollapsed: boolean;
  onToggleGroup: () => void;
  pendingLeaves: number;
  onNavigate?: () => void;
  longestMatchingNavPath: string | null;
}

const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring";

export function SidebarSection({
  group,
  groupIndex,
  isCollapsed,
  isGroupCollapsed,
  onToggleGroup,
  pendingLeaves,
  onNavigate,
  longestMatchingNavPath,
}: SidebarSectionProps) {
  const showItems = isCollapsed || !isGroupCollapsed;

  return (
    <div className={cn(groupIndex > 0 && !isCollapsed && "mt-3")}>
      {!isCollapsed && (
        <button
          type="button"
          onClick={onToggleGroup}
          aria-expanded={!isGroupCollapsed}
          className={cn(
            "group/header flex h-7 w-full items-center justify-between rounded-md px-2.5 text-2xs font-semibold uppercase tracking-[0.08em] text-sidebar-muted transition-colors hover:text-sidebar-accent-foreground select-none",
            focusRing,
          )}
        >
          <span className="truncate">{group.label}</span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-3.5 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
              isGroupCollapsed && "-rotate-90",
            )}
          />
        </button>
      )}

      {isCollapsed && groupIndex > 0 && <div aria-hidden="true" className="mx-auto my-2 h-px w-6 bg-sidebar-border" />}

      {showItems && (
        <ul className={cn("space-y-0.5", isCollapsed && "flex flex-col items-center")}>
          {group.routes.map((route) => {
            const routePath = navHrefPath(route.href);
            const isActive = longestMatchingNavPath !== null && routePath === longestMatchingNavPath;
            const badgeCount = route.badge === "leaves" && pendingLeaves > 0 ? pendingLeaves : 0;
            const badgeText = badgeCount > 99 ? "99+" : String(badgeCount);
            const isSub = !isCollapsed && route.isSubItem;

            const item = (
              <Link
                href={route.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                aria-label={isCollapsed ? route.label : undefined}
                className={cn(
                  "group relative flex items-center rounded-md font-medium transition-colors duration-150",
                  focusRing,
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isCollapsed
                    ? "size-10 justify-center"
                    : isSub
                      ? "h-7 w-full gap-2.5 pl-9 pr-2.5 text-sm"
                      : "h-8 w-full gap-2.5 px-2.5 text-sm",
                  isSub && !isActive && "text-sidebar-foreground/80",
                  // Active indicator: 6px gold circle (logo motif); collapsed → 3px bar.
                  isActive &&
                    (isCollapsed
                      ? "before:absolute before:inset-y-2 before:-left-2 before:w-0.75 before:rounded-full before:bg-sidebar-primary"
                      : "before:absolute before:top-1/2 before:-left-2.5 before:size-1.5 before:-translate-y-1/2 before:rounded-full before:bg-sidebar-primary"),
                )}
              >
                <route.icon
                  aria-hidden="true"
                  strokeWidth={1.75}
                  className={cn(
                    "shrink-0 transition-colors",
                    isSub ? "size-3.5" : "size-4",
                    isActive ? "text-sidebar-primary" : "text-sidebar-muted group-hover:text-sidebar-accent-foreground",
                  )}
                />

                {!isCollapsed && <span className="flex-1 truncate">{route.label}</span>}

                {badgeCount > 0 &&
                  (isCollapsed ? (
                    <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-2 rounded-full bg-sidebar-primary ring-2 ring-sidebar" />
                  ) : (
                    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-sidebar-primary px-1.5 text-3xs font-bold tabular-nums text-sidebar-primary-foreground">
                      {badgeText}
                    </span>
                  ))}
              </Link>
            );

            if (isCollapsed) {
              return (
                <li key={route.href}>
                  <Tooltip>
                    <TooltipTrigger asChild>{item}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={10}>
                      {route.label}
                      {badgeCount > 0 && <span className="ml-1.5 opacity-70">({badgeText})</span>}
                    </TooltipContent>
                  </Tooltip>
                </li>
              );
            }

            return (
              <li key={route.href} className="relative">
                {isSub && (
                  <span aria-hidden="true" className="absolute inset-y-0 left-4.5 w-px bg-sidebar-border" />
                )}
                {item}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
