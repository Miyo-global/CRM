"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronsLeft, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useGetOrganizations } from "@/lib/hooks/auth-hooks";
import { MANAGEMENT_ROLES, hasRole } from "@/lib/constants/roles";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useUnreadNotificationCount } from "@/lib/api/hooks/notifications";
import {
  getNavGroupsForRole,
  getLongestMatchingNavPath,
  navHrefPath,
} from "./sidebar/sidebar-nav-items";
import { SidebarSection } from "./sidebar/sidebar-section";
import { SidebarUserMenu } from "./sidebar/sidebar-user-menu";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";
import { openCommandPalette } from "./shortcuts-provider";

/**
 * Role + nav groups for the signed-in user. Keeps the last known role while the
 * session refetches so the nav doesn't flash empty.
 */
export function useRoleNavGroups() {
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const [lastKnownRole, setLastKnownRole] = useState(role);
  if (role && role !== lastKnownRole) setLastKnownRole(role);
  const effectiveRole = role || lastKnownRole;
  const navGroups = useMemo(() => getNavGroupsForRole(effectiveRole), [effectiveRole]);
  return { session, status, role, effectiveRole, hasEverLoaded: !!effectiveRole, navGroups };
}

interface AppSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
  /** Pending leave approvals resolved on the server, so the badge is right on
   *  first paint instead of after a round trip (A44). */
  initialPendingLeaves?: number;
}

export function AppSidebar({
  isCollapsed = false,
  onToggleCollapse,
  onNavigate,
  initialPendingLeaves = 0,
}: AppSidebarProps) {
  const { session, status, role, effectiveRole, hasEverLoaded, navGroups } = useRoleNavGroups();
  const { data: organizations } = useGetOrganizations();
  const pathname = usePathname();
  // ADMIN approves leave too; the old CEO/HR-only check hid the badge from
  // them and disagreed with the approver rule (A8, A28).
  const isAdmin = hasRole(effectiveRole, MANAGEMENT_ROLES);

  const longestMatchingNavPath = useMemo(
    () => getLongestMatchingNavPath(pathname, navGroups),
    [navGroups, pathname],
  );

  const activeGroupLabel = useMemo(() => {
    if (!longestMatchingNavPath) return null;
    for (const group of navGroups) {
      const ownsLongest = group.routes.some(
        (route) => navHrefPath(route.href) === longestMatchingNavPath,
      );
      if (ownsLongest) return group.label;
    }
    return null;
  }, [navGroups, longestMatchingNavPath]);

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem("sidebar-groups");
      if (stored) setCollapsedGroups(JSON.parse(stored));
    } catch { }
  }, []);

  useEffect(() => {
    if (!activeGroupLabel) return;
    setCollapsedGroups((prev) => {
      if (prev[activeGroupLabel] === false) return prev;
      const next = { ...prev, [activeGroupLabel]: false };
      try { localStorage.setItem("sidebar-groups", JSON.stringify(next)); } catch { }
      return next;
    });
  }, [activeGroupLabel]);

  const toggleGroup = useCallback((label: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [label]: !(prev[label] ?? true) };
      try { localStorage.setItem("sidebar-groups", JSON.stringify(next)); } catch { }
      return next;
    });
  }, []);

  const [pendingLeaves, setPendingLeaves] = useState(initialPendingLeaves);

  // Each navigation brings a freshly resolved server count.
  useEffect(() => setPendingLeaves(initialPendingLeaves), [initialPendingLeaves]);

  useEffect(() => {
    if (!isAdmin || !session?.user) return;
    let cancelled = false;
    async function fetchCounts() {
      try {
        const { getPendingApprovalCount } = await import(
          "@/server/actions/leave-actions"
        );
        const count = await getPendingApprovalCount();
        if (!cancelled) setPendingLeaves(count);
      } catch {
        if (!cancelled) setPendingLeaves(0);
      }
    }
    // The server already resolved this count for the current render, so only
    // the poll runs from here (A44).
    const id = setInterval(fetchCounts, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [session, isAdmin, initialPendingLeaves]);

  const { data: notifData } = useUnreadNotificationCount();
  const unreadNotifCount = notifData?.count ?? 0;

  useEffect(() => {
    const base = "Miyo Global CRM";
    const total = unreadNotifCount;
    document.title = total > 0 ? `(${total > 99 ? "99+" : total}) ${base}` : base;
  }, [unreadNotifCount]);

  const orgName = organizations?.[0]?.name;

  if (
    !hasEverLoaded &&
    (status === "loading" || (status === "authenticated" && !role))
  ) {
    return (
      <div className="flex flex-col h-full bg-sidebar">
        <div className="px-3 py-4 flex-1 space-y-6">
          <div className="flex items-center gap-3 px-1">
            <Skeleton className="size-7 rounded-full bg-sidebar-accent" />
            <Skeleton className="h-4 w-20 rounded bg-sidebar-accent" />
          </div>
          <div className="space-y-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-1.5">
                <Skeleton className="h-4 w-4 rounded bg-sidebar-accent" />
                <Skeleton className="h-3.5 w-24 rounded bg-sidebar-accent" />
              </div>
            ))}
          </div>
        </div>
        <div className="px-3 py-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-7 rounded-full bg-sidebar-accent" />
            <Skeleton className="h-3 w-20 rounded bg-sidebar-accent" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="relative flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-sidebar-border",
            isCollapsed ? "justify-center px-2" : "gap-2 px-3",
          )}
        >
          <Link
            href="/dashboard"
            onClick={onNavigate}
            aria-label={isCollapsed ? "Go to dashboard" : undefined}
            className={cn(
              "flex min-w-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              !isCollapsed && "flex-1",
            )}
          >
            <Image src="/logo.svg" alt="Miyo Global" width={28} height={28} className="size-7 shrink-0" />
            {!isCollapsed && (
              <span className="min-w-0 leading-tight">
                <span className="block truncate font-display text-sm font-bold text-sidebar-accent-foreground">Miyo Global</span>
                <span className="block truncate text-2xs text-sidebar-muted">{orgName ?? "CRM"}</span>
              </span>
            )}
          </Link>
          {onToggleCollapse && !isCollapsed && (
            <CollapseButton isCollapsed={false} onToggle={onToggleCollapse} />
          )}
        </div>

        <div className={cn("shrink-0 pt-3 pb-1", isCollapsed ? "flex justify-center px-2" : "px-3")}>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={openCommandPalette}
                  aria-label="Search"
                  className="size-10 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <Search strokeWidth={1.75} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>Search (⌘K)</TooltipContent>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={openCommandPalette}
              aria-label="Search"
              className="flex h-9 w-full items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/50 px-2.5 text-sm text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              <Search aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
              <span className="flex-1 text-left">Search…</span>
              <Kbd className="border-sidebar-border bg-transparent text-sidebar-muted">⌘K</Kbd>
            </button>
          )}
        </div>

        <ScrollArea className="min-h-0 flex-1 mask-y-from-97%">
          <nav aria-label="Main" className={cn("py-2", isCollapsed ? "px-2" : "px-3")}>
            {navGroups.map((group, i) => {
              const groupLabel = group.label;
              const isGroupCollapsed = groupLabel in collapsedGroups ? collapsedGroups[groupLabel] : true;
              return (
                <SidebarSection
                  key={groupLabel}
                  group={group}
                  groupIndex={i}
                  isCollapsed={isCollapsed}
                  isGroupCollapsed={isGroupCollapsed}
                  onToggleGroup={() => toggleGroup(groupLabel)}
                  pendingLeaves={pendingLeaves}
                  onNavigate={onNavigate}
                  longestMatchingNavPath={longestMatchingNavPath}
                />
              );
            })}
          </nav>
        </ScrollArea>

        <div
          className={cn(
            "shrink-0 border-t border-sidebar-border",
            isCollapsed ? "flex flex-col items-center gap-1 px-2 py-2" : "space-y-1 px-3 py-2",
          )}
        >
          {isCollapsed ? (
            <>
              <NotificationBell tone="inverse" silent />
              {onToggleCollapse && <CollapseButton isCollapsed onToggle={onToggleCollapse} />}
            </>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <NotificationBell tone="inverse" silent />
              <ThemeToggle tone="inverse" />
            </div>
          )}
          <SidebarUserMenu isCollapsed={isCollapsed} isAdmin={isAdmin} />
        </div>
      </div>
    </TooltipProvider>
  );
}

function CollapseButton({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="shrink-0 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <ChevronsLeft
            strokeWidth={1.75}
            className={cn("transition-transform duration-200 motion-reduce:transition-none", isCollapsed && "rotate-180")}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {isCollapsed ? "Expand sidebar" : "Collapse sidebar"} ( [ )
      </TooltipContent>
    </Tooltip>
  );
}
