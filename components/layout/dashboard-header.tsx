"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const NotificationBell = dynamic(
  () => import("./notification-bell").then((m) => ({ default: m.NotificationBell })),
  { ssr: false }
);
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Menu, Search } from "lucide-react";
import { AppSidebar } from "./app-sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/hr": "HR",
  "/hr/leaves": "Leaves",
  "/hr/expenses": "Expenses",
  "/hr/attendance": "Attendance",
  "/hr/payroll": "Payroll",
  "/hr/incentives": "Incentives",
  "/hr/documents": "Documents",
  "/hr/onboarding": "Onboarding",
  "/hr/work-logs": "Work Logs",
  "/hr/org-chart": "Org Chart",
  "/hr/performance": "Performance",
  "/hr/my-payslips": "My Payslips",
  "/hr/my-assets": "My Assets",
  "/hr/my-bonuses": "My Bonuses",
  "/crm": "CRM",
  "/crm/leads": "Lead Pipeline",
  "/crm/deals": "Deals",
  "/crm/targets": "Targets",
  "/crm/analytics": "Analytics",
  "/crm/clients": "Clients",
  "/crm/contacts": "Contacts",
  "/crm/organizations": "Organizations",
  "/crm/reports": "CRM Reports",
  "/projects": "Projects",
  "/timesheets": "Timesheets",
  "/timesheets/team": "Team Timesheets",
  "/settings": "Settings",
  "/settings/organization": "Organization",
  "/settings/members": "Members",
  "/settings/branches": "Branches",
  "/settings/roles": "Roles & Permissions",
  "/settings/audit-log": "Audit Log",
  "/billing": "Billing",
  "/billing/invoices": "Invoices",
  "/sales": "Sales",
  "/customer-executive": "Customer Executive",
  "/chat": "Chat",
  "/support": "Support",
  "/support/inbox": "Inbox",
  "/notifications": "Notifications",
  "/reports": "Reports",
  "/marketing": "Marketing",
  "/digital-marketing": "Digital Marketing",
  "/ceo/qr-code": "QR Codes",
  "/calendar": "Calendar",
};

export function DashboardHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMac, setIsMac] = useState(true);
  const pathname = usePathname();

  const pageTitle = useMemo(() => {
    if (!pathname) return "Dashboard";
    const sorted = Object.keys(ROUTE_TITLES).sort((a, b) => b.length - a.length);
    for (const route of sorted) {
      if (pathname === route || pathname.startsWith(route + "/")) {
        return ROUTE_TITLES[route];
      }
    }
    return "Dashboard";
  }, [pathname]);

  useEffect(() => {
    setIsMac(
      navigator.platform?.toUpperCase().includes("MAC") ||
        navigator.userAgent?.includes("Mac")
    );
  }, []);

  const triggerSearch = () =>
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        metaKey: isMac,
        ctrlKey: !isMac,
        bubbles: true,
      })
    );

  return (
    <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border bg-background/95 backdrop-blur-sm px-3 transition-colors">

      <div className="flex items-center gap-2">

        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} modal>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation"
            className={cn(
              "md:hidden h-8 w-8 rounded-md flex items-center justify-center",
              "text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            )}
          >
            <Menu className="h-4 w-4" />
          </button>
          <SheetContent side="left" className="z-[100] p-0 w-[17rem] border-r-sidebar-border">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <AppSidebar onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        <span className="text-sm flex-1 bg-black font-semibold text-foreground md:hidden">
          {pageTitle}
        </span>
      </div>

      <div className="flex items-center gap-1">

        <button
          type="button"
          onClick={triggerSearch}
          aria-label="Search"
          className={cn(
            "hidden sm:flex items-center gap-2 h-8 rounded-md border border-border bg-muted/50 px-2.5",
            "text-muted-foreground text-xs hover:border-border/80 hover:bg-muted transition-colors",
            "w-44"
          )}
        >
          <Search className="h-3 w-3 shrink-0" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="hidden sm:inline-flex h-4 items-center gap-0.5 rounded border border-border bg-background px-1 font-mono text-[9px] text-muted-foreground">
            {isMac ? "⌘" : "Ctrl"}K
          </kbd>
        </button>

        <NotificationBell />
      </div>
    </header>
  );
}
