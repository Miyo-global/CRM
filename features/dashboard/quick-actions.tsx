"use client";

import { memo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion-variants";
import {
  UserPlus,
  BarChart3,
  CalendarDays,
  Contact2,
  Clock,
  Briefcase,
  CheckSquare,
  Network,
  Ticket,
} from "lucide-react";

interface QuickAction {
  label: string;
  icon: React.ElementType;
  href: string;
}

export function getQuickActionsForRole(role: string | undefined): QuickAction[] {
  switch (role) {
    case "CEO":
      return [
        { label: "Add Employee", icon: UserPlus, href: "/hr/onboarding?tab=wizard" },
        { label: "View Reports", icon: BarChart3, href: "/crm/reports" },
        { label: "Team Schedule", icon: CalendarDays, href: "/hr/attendance" },
      ];
    case "HR":
    case "ADMIN":
    case "BRANCH_HR":
      return [
        { label: "Add Employee", icon: UserPlus, href: "/hr/onboarding?tab=wizard" },
        { label: "View Reports", icon: BarChart3, href: "/crm/reports" },
        { label: "Team Schedule", icon: CalendarDays, href: "/hr/attendance" },
        { label: "Org Chart", icon: Network, href: "/hr/org-chart" },
      ];
    case "BRANCH_MANAGER":
      return [
        { label: "View Reports", icon: BarChart3, href: "/crm/reports" },
        { label: "Team Schedule", icon: CalendarDays, href: "/hr/attendance" },
        { label: "Org Chart", icon: Network, href: "/hr/org-chart" },
        { label: "Check In", icon: Clock, href: "/hr/attendance" },
      ];
    case "SALES":
      return [
        { label: "View My Leads", icon: Contact2, href: "/crm/leads" },
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
      {actions.map((action) => {
        const ActionIcon = action.icon;
        return (
          <motion.div key={action.label} variants={fadeUp}>
            <Link href={action.href} aria-label={action.label}>
              <div className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 shadow-noir transition-all duration-200 hover:border-gold/40 hover:shadow-md hover:bg-gold/5 cursor-pointer">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 transition-colors group-hover:bg-gold/20">
                  <ActionIcon className="h-5 w-5 text-gold" aria-hidden="true" />
                </div>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {action.label}
                </span>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
});
