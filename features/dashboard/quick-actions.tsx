"use client";

import { memo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion-variants";
import { IconChip } from "@/components/ui/icon-chip";
import {
  UserPlus,
  BarChart3,
  CalendarDays,
  CalendarCheck,
  Clock,
  Briefcase,
  CheckSquare,
  Network,
  Ticket,
  type LucideIcon,
} from "lucide-react";

interface QuickAction {
  label: string;
  icon: LucideIcon;
  href: string;
}

export function getQuickActionsForRole(role: string | undefined): QuickAction[] {
  switch (role) {
    case "CEO":
      return [
        { label: "Add Employee", icon: UserPlus, href: "/hr/onboarding?tab=wizard" },
        { label: "View Reports", icon: BarChart3, href: "/reports" },
        { label: "Team Schedule", icon: CalendarDays, href: "/hr/attendance" },
      ];
    case "HR":
    case "ADMIN":
    case "BRANCH_HR":
      return [
        { label: "Add Employee", icon: UserPlus, href: "/hr/onboarding?tab=wizard" },
        { label: "View Reports", icon: BarChart3, href: "/reports" },
        { label: "Team Schedule", icon: CalendarDays, href: "/hr/attendance" },
        { label: "Org Chart", icon: Network, href: "/hr/org-chart" },
      ];
    case "BRANCH_MANAGER":
      return [
        { label: "View Reports", icon: BarChart3, href: "/reports" },
        { label: "Team Schedule", icon: CalendarDays, href: "/hr/attendance" },
        { label: "Org Chart", icon: Network, href: "/hr/org-chart" },
        { label: "Check In", icon: Clock, href: "/hr/attendance" },
      ];
    case "SALES":
      return [
        { label: "Request Leave", icon: CalendarCheck, href: "/hr/leaves" },
        { label: "Check In", icon: Clock, href: "/hr/attendance" },
      ];
    case "CUSTOMER_SUPPORT":
      return [
        { label: "View My Tickets", icon: Ticket, href: "/support" },
        { label: "Check In", icon: Clock, href: "/hr/attendance" },
      ];
    case "ENGINEERING":
    case "DESIGN":
    case "VIDEO_EDITOR":
    case "DIGITAL_MARKETING":
      return [
        { label: "My Projects", icon: Briefcase, href: "/projects" },
        { label: "My Tasks", icon: CheckSquare, href: "/projects" },
        { label: "Check In", icon: Clock, href: "/hr/attendance" },
      ];
    default:
      return [
        { label: "Check In", icon: Clock, href: "/hr/attendance" },
      ];
  }
}

export const QuickActions = memo(function QuickActions() {
  const { data: session } = useSession();
  const actions = getQuickActionsForRole(session?.user?.role);

  if (actions.length === 0) return null;

  return (
    <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${actions.length >= 5 ? "md:grid-cols-5" : actions.length >= 4 ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
      {actions.map((action) => (
        <motion.div key={action.label} variants={fadeUp}>
          <Link
            href={action.href}
            aria-label={action.label}
            className="flex h-14 items-center gap-3 rounded-lg border border-border bg-card px-3 shadow-xs outline-none transition-[background-color,border-color] hover:border-border-strong hover:bg-accent focus-visible:focus-ring"
          >
            <IconChip icon={action.icon} tone="brand" size="sm" className="size-8" />
            <span className="truncate text-sm font-medium text-foreground">{action.label}</span>
          </Link>
        </motion.div>
      ))}
    </div>
  );
});
