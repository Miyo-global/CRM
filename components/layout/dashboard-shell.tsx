"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Menu } from "lucide-react";
import { AppSidebar } from "./app-sidebar";
import { CommandPalette } from "./command-palette";
import { NotActivatedPage } from "../auth/not-activated-page";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePushSubscription } from "@/hooks/use-push-subscription";
import Image from "next/image";

const ChatUnreadNotifications = dynamic(
  () => import("@/components/chat/chat-unread-notifications").then((m) => m.ChatUnreadNotifications),
  { ssr: false }
);

const SIDEBAR_COOKIE = "sidebar-collapsed";
const SIDEBAR_COLLAPSED_W = "3.5rem";
const SIDEBAR_EXPANDED_W = "17rem";

function setSidebarCookie(collapsed: boolean) {
  document.cookie = `${SIDEBAR_COOKIE}=${collapsed}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

interface DashboardShellProps {
  userId: string;
  hasDashboardAccess: boolean;
  defaultCollapsed: boolean;
  children: React.ReactNode;
}

export function DashboardShell({
  userId,
  hasDashboardAccess,
  defaultCollapsed,
  children,
}: DashboardShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(defaultCollapsed);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  usePushSubscription(userId);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      setSidebarCookie(next);
      return next;
    });
  }, []);

  const handleCloseMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  const sidebarW = isSidebarCollapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_EXPANDED_W;

  return (
    <div className="h-[100dvh] max-h-[100dvh] flex bg-background overflow-hidden">
      {hasDashboardAccess && <ChatUnreadNotifications currentUserId={userId} />}
      <Link
        href="#dashboard-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[200] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to content
      </Link>

      {hasDashboardAccess && !isMobile && (
        <aside
          aria-label="Sidebar"
          style={{ width: sidebarW }}
          className="hidden md:flex flex-col h-full min-h-0 border-r border-sidebar-border bg-sidebar shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden relative z-30"
        >
          <AppSidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
          />
        </aside>
      )}

      <main
        id="dashboard-content"
        className="flex-1 min-w-0 flex flex-col h-full min-h-0 overflow-hidden"
      >
        {hasDashboardAccess ? (
          <>
            <CommandPalette />

            {isMobile && (
              <header className="md:hidden sticky top-0 z-40 flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border bg-background/95 backdrop-blur-sm px-3">
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} modal>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(true)}
                    aria-label="Open navigation"
                    className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Menu className="h-4 w-4" />
                  </button>
                  <SheetContent side="left" className="z-[100] p-0 w-[17rem] border-r-sidebar-border">
                    <SheetTitle className="sr-only">Navigation</SheetTitle>
                    <AppSidebar onNavigate={handleCloseMobileMenu} />
                  </SheetContent>
                </Sheet>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg overflow-hidden bg-gold/15 ring-1 ring-gold/20 flex items-center justify-center">
                    <Image src="/logo.svg" alt="Miyo Global" width={20} height={20} className="object-contain" />
                  </div>
                  <span className="text-sm font-bold gold-text">Miyo Global</span>
                </div>
              </header>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain">
              {children}
            </div>
          </>
        ) : (
          <NotActivatedPage />
        )}
      </main>
    </div>
  );
}
