"use client";

import { useSession } from "next-auth/react";
import { WidgetCard } from "@/components/dashboard/widgets/widget-card";
import { IconChip } from "@/components/ui/icon-chip";
import { Zap, CalendarCheck, Users, ListChecks, Clock, Receipt, type LucideIcon } from "lucide-react";
import Link from "next/link";

interface QuickAction {
  label: string;
  icon: LucideIcon;
  href: string;
}

function getActionsForRole(role: string | undefined): QuickAction[] {
  switch (role) {
    case "CEO":
    case "ADMIN":
      return [
        { label: "Approve Leaves", icon: CalendarCheck, href: "/hr/leaves" },
        { label: "Add employee", icon: Users, href: "/hr/onboarding?tab=wizard" },
      ];
    case "HR":
      return [
        { label: "Approve Leaves", icon: CalendarCheck, href: "/hr/leaves" },
        { label: "Run Payroll", icon: Receipt, href: "/hr/payroll" },
        { label: "Add employee", icon: Users, href: "/hr/onboarding?tab=wizard" },
      ];
    default:
      return [
        { label: "Log Time", icon: Clock, href: "/timesheets" },
        { label: "Request leave", icon: CalendarCheck, href: "/hr/leaves" },
        { label: "Overdue Tasks", icon: ListChecks, href: "/tasks/overdue" },
      ];
  }
}

/** 72px tile: icon chip + label (§6.2 quick actions). */
export function QuickActionTile({ action }: { action: QuickAction }) {
  return (
    <Link
      href={action.href}
      aria-label={action.label}
      className="flex h-18 flex-col items-center justify-center gap-1.5 rounded-md border border-border bg-card px-2 text-center outline-none transition-colors hover:bg-accent focus-visible:focus-ring"
    >
      <IconChip icon={action.icon} tone="brand" size="sm" />
      <span className="w-full truncate text-xs font-medium text-foreground">{action.label}</span>
    </Link>
  );
}

export function QuickActionsWidget() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const actions = getActionsForRole(role);

  return (
    <WidgetCard title="Quick Actions" icon={Zap}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {actions.map((action) => (
          <QuickActionTile key={action.label} action={action} />
        ))}
      </div>
    </WidgetCard>
  );
}
