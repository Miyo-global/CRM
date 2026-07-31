import type { LucideIcon } from "lucide-react";
import {
  Plus,
  UserPlus,
  BarChart3,
  CalendarDays,
  Contact2,
  Clock,
  Briefcase,
  CheckSquare,
  Network,
  Ticket,
  CalendarCheck,
  ListChecks,
  TrendingUp,
  Target,
  Zap,
  Users,
  Building2,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
} from "lucide-react";
import { isBranchRole } from "@/lib/rbac/roles";

export type DashboardRoleGroup =
  | "ceo"
  | "hr"
  | "manager"
  | "employee"
  | "sales"
  | "projectWorker"
  | "default";

export interface DashboardQuickAction {
  label: string;
  icon: LucideIcon;
  href: string;
}

export interface DashboardStatsShape {
  totalEmployees: number;
  activeProjects: number;
  presentToday: number;
  orgName: string;
}

export interface StatCardItem {
  id: string;
  label: string;
  value: number | string;
  icon: LucideIcon;
  href?: string;
}

const PROJECT_WORKER_ROLES = new Set([
  "ENGINEERING",
  "DESIGN",
  "VIDEO_EDITOR",
  "DIGITAL_MARKETING",
  "CUSTOMER_SUPPORT",
]);

const MEETING_TOAST_ROLES = new Set(["CEO", "SALES", "BRANCH_MANAGER", "BRANCH_HR"]);

export function getDashboardRoleGroup(role: string | undefined): DashboardRoleGroup {
  if (role === "CEO") return "ceo";
  if (role === "HR" || role === "ADMIN") return "hr";
  if (isBranchRole(role)) return "manager";
  if (role === "SALES") return "sales";
  if (role && PROJECT_WORKER_ROLES.has(role)) return "projectWorker";
  if (role) return "employee";
  return "default";
}

export function shouldFetchProjects(role: string | undefined): boolean {
  const group = getDashboardRoleGroup(role);
  return group === "ceo" || group === "projectWorker";
}

export function shouldFetchTeamAvailability(role: string | undefined): boolean {
  return role === "CEO";
}

export function shouldFetchTodayActivities(role: string | undefined): boolean {
  return !!role && MEETING_TOAST_ROLES.has(role);
}

export function shouldUseMyIssuesCard(role: string | undefined): boolean {
  const group = getDashboardRoleGroup(role);
  return group === "ceo" || group === "projectWorker";
}

export function shouldUseMyTasksWidget(role: string | undefined): boolean {
  const group = getDashboardRoleGroup(role);
  return group === "manager" || group === "employee" || group === "hr";
}

export function getQuickActions(role: string | undefined): DashboardQuickAction[] {
  switch (role) {
    case "CEO":
      return [
        { label: "New Project", icon: Plus, href: "/projects" },
        { label: "Add Employee", icon: UserPlus, href: "/hr/onboarding?tab=wizard" },
        { label: "View Reports", icon: BarChart3, href: "/crm/reports" },
        { label: "Team Schedule", icon: CalendarDays, href: "/hr/attendance" },
      ];
    case "HR":
    case "ADMIN":
      return [
        { label: "Approve Leaves", icon: CalendarCheck, href: "/hr/leaves" },
        { label: "Add Employee", icon: UserPlus, href: "/hr/onboarding?tab=wizard" },
        { label: "Org Chart", icon: Network, href: "/hr/org-chart" },
        { label: "HR Dashboard", icon: LayoutDashboard, href: "/hr" },
      ];
    case "SALES":
      return [
        { label: "View My Leads", icon: Contact2, href: "/crm/leads" },
        { label: "Check In", icon: Clock, href: "/hr/attendance" },
        { label: "Sales Dashboard", icon: TrendingUp, href: "/sales" },
      ];
    case "BRANCH_MANAGER":
    case "BRANCH_HR":
      return [
        { label: "Assign Task", icon: ListChecks, href: "/projects" },
        { label: "Approve Leave", icon: CalendarCheck, href: "/hr/leaves" },
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
      return [{ label: "Check In", icon: Clock, href: "/hr/attendance" }];
  }
}

export function getStatCards(
  stats: DashboardStatsShape,
  role: string | undefined,
  roleStats: Record<string, number> | undefined,
  options?: { pendingLeaves?: number },
): StatCardItem[] {
  const rs = roleStats;
  const pendingLeaves = options?.pendingLeaves ?? 0;

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
        {
          id: "pending-leaves",
          label: "Pending Leaves",
          value: pendingLeaves,
          icon: ClipboardList,
          href: "/hr/leaves",
        },
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
      return [{ id: "org", label: "Organization", value: stats.orgName, icon: Building2 }];
  }
}
