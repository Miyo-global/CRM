"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { AppSidebar, useRoleNavGroups } from "./app-sidebar";
import { CommandPalette } from "./command-palette";
import { Topbar } from "./topbar";
import { ShortcutsProvider } from "./shortcuts-provider";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePushSubscription } from "@/hooks/use-push-subscription";

const DESKTOP_SIDEBAR_MIN_WIDTH = 1024;
const SIDEBAR_COOKIE = "sidebar-collapsed";
const SIDEBAR_COLLAPSED_W = "4rem";
const SIDEBAR_EXPANDED_W = "16rem";

function setSidebarCookie(collapsed: boolean) {
  document.cookie = `${SIDEBAR_COOKIE}=${collapsed}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

interface DashboardShellProps {
  userId: string;
  defaultCollapsed: boolean;
  /** Resolved on the server so the sidebar badge needs no client round trip (A44). */
  pendingLeaveApprovals?: number;
  children: React.ReactNode;
}

export function DashboardShell({
  userId,
  defaultCollapsed,
  pendingLeaveApprovals = 0,
  children,
}: DashboardShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(defaultCollapsed);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile(DESKTOP_SIDEBAR_MIN_WIDTH);
  const { navGroups } = useRoleNavGroups();
  usePushSubscription(userId);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      setSidebarCookie(next);
      return next;
    });
  }, []);

  const handleCloseMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  const handleOpenMobileMenu = useCallback(() => setMobileMenuOpen(true), []);

  const sidebarW = isSidebarCollapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_EXPANDED_W;

  return (
    <ShortcutsProvider navGroups={navGroups} onToggleSidebar={handleToggleSidebar}>
      <div className="flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-background">
        <Link
          href="#dashboard-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-skip-link focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-md"
        >
          Skip to content
        </Link>

        {!isMobile && (
          <aside
            aria-label="Sidebar"
            style={{ width: sidebarW }}
            className="relative z-sidebar hidden h-full min-h-0 shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-out motion-reduce:transition-none lg:flex"
          >
            <AppSidebar
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={handleToggleSidebar}
              initialPendingLeaves={pendingLeaveApprovals}
            />
          </aside>
        )}

        <main
          id="dashboard-content"
          className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        >
          <CommandPalette />

          {isMobile && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} modal>
              <SheetContent
                side="left"
                className="z-modal w-64 gap-0 border-sidebar-border bg-sidebar p-0 [&>button]:text-sidebar-muted [&>button]:hover:bg-sidebar-accent [&>button]:hover:text-sidebar-accent-foreground"
              >
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <AppSidebar onNavigate={handleCloseMobileMenu} initialPendingLeaves={pendingLeaveApprovals} />
              </SheetContent>
            </Sheet>
          )}

          <Topbar navGroups={navGroups} onOpenMobileNav={handleOpenMobileMenu} />
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
            {children}
          </div>
        </main>
      </div>
    </ShortcutsProvider>
  );
}
