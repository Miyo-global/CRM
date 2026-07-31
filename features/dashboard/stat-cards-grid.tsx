"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion-variants";
import { StatCard } from "@/components/ui/stat-card";
import {
  type LucideIcon,
  Users,
  Briefcase,
  CalendarCheck,
  Building2,
  Contact2,
  Ticket,
  Target,
  TrendingUp,
  CheckCircle2,
  ListChecks,
  Zap,
} from "lucide-react";

interface DashboardStats {
  totalEmployees: number;
  activeProjects: number;
  presentToday: number;
  orgName: string;
}

interface StatCardItem {
  id: string;
  label: string;
  value: number | string;
  icon: LucideIcon;
  href?: string;
}

interface StatCardsGridProps {
  stats: DashboardStats;
  role: string | undefined;
  roleStats: Record<string, number> | undefined;
}

function buildStatCards(
  stats: DashboardStats,
  role: string | undefined,
  roleStats: Record<string, number> | undefined,
): StatCardItem[] {
  const rs = roleStats;

  switch (role) {
    case "CEO":
      return [
        { id: "employees", label: "Total Employees", value: stats.totalEmployees, icon: Users, href: "/hr" },
        { id: "projects", label: "Active Projects", value: stats.activeProjects, icon: Briefcase, href: "/projects" },
        { id: "present", label: "Present Today", value: stats.presentToday, icon: CalendarCheck, href: "/hr/attendance" },
        { id: "org", label: "Organization", value: stats.orgName, icon: Building2 },
      ];
    case "HR":
    case "ADMIN":
      return [
        { id: "employees", label: "Total Employees", value: stats.totalEmployees, icon: Users, href: "/hr" },
        { id: "present", label: "Present Today", value: stats.presentToday, icon: CalendarCheck, href: "/hr/attendance" },
        { id: "projects", label: "Active Projects", value: stats.activeProjects, icon: Briefcase, href: "/projects" },
        { id: "org", label: "Organization", value: stats.orgName, icon: Building2 },
      ];
    case "SALES":
      return [
        { id: "leads", label: "My Leads", value: rs?.myLeads ?? 0, icon: Contact2, href: "/crm/leads" },
        { id: "converted", label: "Converted", value: rs?.myConverted ?? 0, icon: TrendingUp, href: "/crm/leads" },
        { id: "deals", label: "My Deals", value: rs?.myDeals ?? 0, icon: Zap, href: "/crm/deals" },
        { id: "target", label: "Target Progress", value: `${rs?.targetProgress ?? 0}%`, icon: Target, href: "/crm/targets" },
      ];
    case "CUSTOMER_SUPPORT":
      return [
        { id: "projects", label: "My Projects", value: rs?.myProjects ?? 0, icon: Briefcase, href: "/projects" },
        { id: "tickets", label: "My Tickets", value: rs?.myTickets ?? 0, icon: Ticket },
        { id: "done", label: "Completed", value: rs?.myTicketsDone ?? 0, icon: CheckCircle2 },
        { id: "inprogress", label: "In Progress", value: rs?.myTicketsInProgress ?? 0, icon: ListChecks },
      ];
    case "ENGINEERING":
    case "DESIGN":
    case "VIDEO_EDITOR":
    case "DIGITAL_MARKETING":
      return [
        { id: "projects", label: "My Projects", value: rs?.myProjects ?? 0, icon: Briefcase, href: "/projects" },
        { id: "tickets", label: "My Tasks", value: rs?.myTickets ?? 0, icon: ListChecks },
        { id: "done", label: "Completed", value: rs?.myTicketsDone ?? 0, icon: CheckCircle2 },
        { id: "inprogress", label: "In Progress", value: rs?.myTicketsInProgress ?? 0, icon: Zap },
      ];
    default:
      return [
        { id: "org", label: "Organization", value: stats.orgName, icon: Building2 },
      ];
  }
}

export function StatCardsGrid({ stats, role, roleStats }: StatCardsGridProps) {
  const statCards = useMemo(
    () => buildStatCards(stats, role, roleStats),
    [stats, role, roleStats],
  );

  const gridClass = `grid gap-4 grid-cols-1 ${
    statCards.length >= 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : statCards.length >= 3
        ? "sm:grid-cols-2 md:grid-cols-3"
        : "sm:grid-cols-2"
  }`;

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" className={gridClass}>
      {statCards.map((stat, i) => (
        <StatCard
          key={stat.id}
          label={stat.label}
          value={stat.value}
          icon={stat.icon}
          href={stat.href}
          index={i}
        />
      ))}
    </motion.div>
  );
}
