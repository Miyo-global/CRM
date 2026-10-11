"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Scoring Rules", href: "/crm/settings/scoring-rules" },
  { label: "Assignment Rules", href: "/crm/settings/assignment-rules" },
  { label: "SLA Policies", href: "/crm/settings/sla" },
  { label: "Email Templates", href: "/crm/settings/email-templates" },
] as const;

export default function CrmSettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* <md: underline tabs */}
      <nav
        aria-label="CRM Settings"
        className="flex shrink-0 items-center gap-6 overflow-x-auto border-b border-border bg-background px-4 sm:px-6 md:hidden"
      >
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-sm px-0.5 text-sm font-medium transition-colors duration-150 focus-visible:focus-ring",
                "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground after:hidden hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* ≥md: 200px left sub-nav */}
      <nav
        aria-label="CRM Settings"
        className="hidden w-50 shrink-0 flex-col gap-0.5 border-r border-border bg-background p-3 md:flex"
      >
        <p className="px-2 pb-1.5 pt-1 text-2xs font-semibold uppercase tracking-wider text-subtle-foreground">
          CRM settings
        </p>
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-8 items-center gap-2 rounded-md px-2 text-sm transition-colors duration-150 focus-visible:focus-ring",
                isActive
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <span
                aria-hidden
                className={cn("size-1.5 shrink-0 rounded-full", isActive ? "bg-primary" : "bg-transparent")}
              />
              <span className="truncate">{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  );
}
