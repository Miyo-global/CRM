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
    <div className="flex flex-col h-full">
      <div className="shrink-0 border-b bg-background/95 backdrop-blur-sm px-1">
        <nav className="flex items-center gap-1 overflow-x-auto" aria-label="CRM Settings">
          {TABS.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
