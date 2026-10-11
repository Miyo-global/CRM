

import {
  LayoutDashboard, Users, Briefcase, Settings, Clock, CalendarCheck, CalendarDays,
  Receipt, FileText, Timer, QrCode, DollarSign, Handshake,
  Contact2, Trophy, BarChart3, UserCheck, Network, ClipboardList,
  Shield, ShieldCheck, CreditCard, Wallet, Star, HeadphonesIcon, UserSearch,
  TrendingUp, BookOpen, Heart, UserMinus, Target, Megaphone, Mail, Package,
  Share2, Video, Globe,

  Bell, GraduationCap, ClipboardCheck, PackageMinus, Gift, Award,
  MailOpen, Smile, FileCheck, Coins, Map, MapPin, RefreshCcw, Zap,
  ListChecks, PartyPopper, History, BarChart2, LifeBuoy, Inbox,
  Building2, UserCog, SlidersHorizontal, UserX,
  Activity, FlaskConical, Sparkles, Brain, Copy, Search, ShieldAlert, Sliders,
  FormInput, CalendarRange, FileSearch, LayoutTemplate, Grid3X3,
} from "lucide-react";

export interface NavRoute {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: "leaves";
  isProjectsList?: boolean;
  isSubItem?: boolean;
}

export interface NavGroup {
  label: string;
  routes: NavRoute[];

  defaultCollapsed?: boolean;
}


export function getNavGroupsForRole(role: string | undefined): NavGroup[] {
  if (!role) return [];

  switch (role) {
    case "CEO":
    case "ADMIN":
      return [
        {
          label: "Core",
          routes: [
            { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
            { label: "System Health", icon: Activity, href: "/dashboard/admin-health" },
            { label: "Branches", icon: Building2, href: "/dashboard/branches" },
            { label: "AI Hub", icon: Sparkles, href: "/ai" },
            { label: "Calendar", icon: CalendarDays, href: "/calendar" },
            { label: "QR Codes", icon: QrCode, href: "/ceo/qr-code" },
            { label: "Notifications", icon: Bell, href: "/notifications" },
          ],
        },
        {
          label: "HR – People",
          routes: [
            { label: "Employees", icon: Users, href: "/hr" },
            { label: "Skills Matrix", icon: Grid3X3, href: "/hr/employees/skills-matrix", isSubItem: true },
            { label: "Find Expert", icon: Search, href: "/hr/employees/find-expert", isSubItem: true },
            { label: "Terminated", icon: UserX, href: "/hr/employees/terminated", isSubItem: true },
            { label: "Org Chart", icon: Network, href: "/hr/org-chart", isSubItem: true },
          ],
        },
        {
          label: "HR – Operations",
          routes: [
            { label: "Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "Leaves", icon: CalendarCheck, href: "/hr/leaves", badge: "leaves" },
            { label: "Payroll", icon: CreditCard, href: "/hr/payroll" },
            { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips", isSubItem: true },
            { label: "My Bonuses", icon: Gift, href: "/hr/my-bonuses", isSubItem: true },
            { label: "My Assets", icon: Package, href: "/hr/my-assets", isSubItem: true },
            { label: "Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "Work Logs", icon: History, href: "/hr/work-logs" },
            { label: "Holidays", icon: CalendarDays, href: "/hr/holidays" },
          ],
        },
        {
          label: "HR – Lifecycle",
          defaultCollapsed: true,
          routes: [
            { label: "Onboarding", icon: ClipboardList, href: "/hr/onboarding?tab=workflow" },
            { label: "Exit", icon: UserMinus, href: "/hr/exit" },
            { label: "Termination", icon: UserX, href: "/hr/termination", isSubItem: true },
          ],
        },
        {
          label: "HR – Documents",
          defaultCollapsed: true,
          routes: [
            { label: "Documents", icon: FileText, href: "/hr/documents" },
            { label: "Handbook", icon: BookOpen, href: "/hr/handbook", isSubItem: true },
            { label: "Doc Types", icon: FileCheck, href: "/hr/document-types", isSubItem: true },
            { label: "Doc Review", icon: FileText, href: "/hr/document-review", isSubItem: true },
            { label: "Email Templates", icon: MailOpen, href: "/hr/email-templates" },
            { label: "Offer Letter Templates", icon: FileText, href: "/hr/offer-letter-templates", isSubItem: true },
          ],
        },
        {
          label: "HR – Assets",
          defaultCollapsed: true,
          routes: [
            { label: "Assets", icon: Package, href: "/hr/assets" },
            { label: "Asset Returns", icon: PackageMinus, href: "/hr/asset-returns", isSubItem: true },
          ],
        },
        {
          label: "HR – Support",
          routes: [
            { label: "Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk" },
            { label: "Support Tickets", icon: LifeBuoy, href: "/support", isSubItem: true },
            { label: "Support Inbox", icon: Inbox, href: "/support/inbox", isSubItem: true },
            { label: "HR Analytics", icon: BarChart3, href: "/hr/analytics" },
          ],
        },
        {
          label: "HR – Growth",
          defaultCollapsed: true,
          routes: [
            { label: "Performance", icon: Star, href: "/hr/performance" },
            { label: "Recognition", icon: Heart, href: "/hr/recognition" },
            { label: "Career Ladders", icon: TrendingUp, href: "/hr/career-ladders" },
            { label: "Career Profiles", icon: UserCheck, href: "/hr/career-profiles", isSubItem: true },
            { label: "Evaluations", icon: ClipboardList, href: "/hr/career-evaluations", isSubItem: true },
            { label: "Promotions", icon: Award, href: "/hr/career-promotions", isSubItem: true },
          ],
        },
        {
          label: "HR – Compensation",
          defaultCollapsed: true,
          routes: [
            { label: "Bonuses", icon: Gift, href: "/hr/bonuses" },
            { label: "Incentives", icon: Coins, href: "/hr/incentives" },
          ],
        },
        {
          label: "Recruitment",
          routes: [
            { label: "Recruitment Hub", icon: UserSearch, href: "/hr/recruitment" },
            { label: "Jobs", icon: Briefcase, href: "/hr/recruitment/jobs", isSubItem: true },
            { label: "Candidates", icon: Users, href: "/hr/recruitment/candidates", isSubItem: true },
            { label: "Pipeline", icon: TrendingUp, href: "/hr/recruitment/pipeline", isSubItem: true },
            { label: "Interviews", icon: Video, href: "/hr/recruitment/interviews", isSubItem: true },
            { label: "Question Bank", icon: BookOpen, href: "/hr/recruitment/question-bank", isSubItem: true },
            { label: "Hiring Flows", icon: LayoutTemplate, href: "/hr/recruitment/hiring-flows", isSubItem: true },
          ],
        },
        {
          label: "Projects & Time",
          routes: [
            { label: "All Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            { label: "Templates", icon: LayoutTemplate, href: "/projects/templates", isSubItem: true },
            { label: "Resource Allocation", icon: Users, href: "/projects/resource-allocation", isSubItem: true },
            { label: "Timesheets", icon: Timer, href: "/timesheets/team" },
          ],
        },
        {
          label: "System",
          routes: [
            { label: "Settings", icon: Settings, href: "/settings" },
            { label: "Organization", icon: Building2, href: "/settings/organization", isSubItem: true },
            { label: "Members", icon: UserCog, href: "/settings/members", isSubItem: true },
            { label: "Custom Fields", icon: Sliders, href: "/settings/custom-fields", isSubItem: true },
            { label: "Roles & Permissions", icon: Shield, href: "/settings/roles" },
            { label: "Permission Matrix", icon: ShieldAlert, href: "/settings/permissions", isSubItem: true },
            { label: "Audit Log", icon: ShieldCheck, href: "/settings/audit-log" },
            { label: "Webhooks", icon: Zap, href: "/settings/webhooks" },
            { label: "AI Settings", icon: Brain, href: "/settings/ai" },
            { label: "Notifications", icon: Bell, href: "/settings/notifications", isSubItem: true },
            { label: "Custom Fields", icon: Sliders, href: "/settings/custom-fields", isSubItem: true },
            { label: "Data Hub", icon: FileText, href: "/settings/data-hub" },
            { label: "Recruitment Integrations", icon: Globe, href: "/settings/integrations/recruitment", isSubItem: true },
            { label: "Job office locations", icon: MapPin, href: "/settings/job-office-locations", isSubItem: true },
            { label: "Job Roles", icon: Briefcase, href: "/settings/job-roles", isSubItem: true },
            { label: "Payroll Schedule", icon: CalendarRange, href: "/settings/payroll-schedule", isSubItem: true },
            { label: "Termination Reasons", icon: UserX, href: "/settings/termination-reasons", isSubItem: true },
            { label: "Reports", icon: BarChart2, href: "/reports" },
          ],
        },
      ];

    case "HR":
      return [
        {
          label: "Core",
          routes: [
            { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
            { label: "System Health", icon: Activity, href: "/dashboard/admin-health" },
            { label: "Branches", icon: Building2, href: "/dashboard/branches" },
            { label: "AI Hub", icon: Sparkles, href: "/ai" },
            { label: "Calendar", icon: CalendarDays, href: "/calendar" },
            { label: "Notifications", icon: Bell, href: "/notifications" },
          ],
        },
        {
          label: "HR – People",
          routes: [
            { label: "Employees", icon: Users, href: "/hr" },
            { label: "Skills Matrix", icon: Grid3X3, href: "/hr/employees/skills-matrix", isSubItem: true },
            { label: "Find Expert", icon: Search, href: "/hr/employees/find-expert", isSubItem: true },
            { label: "Terminated", icon: UserX, href: "/hr/employees/terminated", isSubItem: true },
            { label: "Org Chart", icon: Network, href: "/hr/org-chart", isSubItem: true },
          ],
        },
        {
          label: "HR – Operations",
          routes: [
            { label: "Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "Leaves", icon: CalendarCheck, href: "/hr/leaves", badge: "leaves" },
            { label: "Payroll", icon: CreditCard, href: "/hr/payroll" },
            { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips", isSubItem: true },
            { label: "My Bonuses", icon: Gift, href: "/hr/my-bonuses", isSubItem: true },
            { label: "My Assets", icon: Package, href: "/hr/my-assets", isSubItem: true },
            { label: "Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "Work Logs", icon: History, href: "/hr/work-logs" },
            { label: "Holidays", icon: CalendarDays, href: "/hr/holidays" },
          ],
        },
        {
          label: "HR – Lifecycle",
          defaultCollapsed: true,
          routes: [
            { label: "Onboarding", icon: ClipboardList, href: "/hr/onboarding?tab=workflow" },
            { label: "Exit", icon: UserMinus, href: "/hr/exit" },
            { label: "Termination", icon: UserX, href: "/hr/termination", isSubItem: true },
          ],
        },
        {
          label: "HR – Documents",
          defaultCollapsed: true,
          routes: [
            { label: "Documents", icon: FileText, href: "/hr/documents" },
            { label: "Handbook", icon: BookOpen, href: "/hr/handbook", isSubItem: true },
            { label: "Doc Types", icon: FileCheck, href: "/hr/document-types", isSubItem: true },
            { label: "Doc Review", icon: FileText, href: "/hr/document-review", isSubItem: true },
            { label: "Email Templates", icon: MailOpen, href: "/hr/email-templates" },
            { label: "Offer Letter Templates", icon: FileText, href: "/hr/offer-letter-templates", isSubItem: true },
          ],
        },
        {
          label: "HR – Assets",
          defaultCollapsed: true,
          routes: [
            { label: "Assets", icon: Package, href: "/hr/assets" },
            { label: "Asset Returns", icon: PackageMinus, href: "/hr/asset-returns", isSubItem: true },
          ],
        },
        {
          label: "HR – Support",
          routes: [
            { label: "Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk" },
            { label: "Support Tickets", icon: LifeBuoy, href: "/support", isSubItem: true },
            { label: "Support Inbox", icon: Inbox, href: "/support/inbox", isSubItem: true },
            { label: "HR Analytics", icon: BarChart3, href: "/hr/analytics" },
          ],
        },
        {
          label: "HR – Growth",
          defaultCollapsed: true,
          routes: [
            { label: "Performance", icon: Star, href: "/hr/performance" },
            { label: "Recognition", icon: Heart, href: "/hr/recognition" },
            { label: "Career Ladders", icon: TrendingUp, href: "/hr/career-ladders" },
            { label: "Career Profiles", icon: UserCheck, href: "/hr/career-profiles", isSubItem: true },
            { label: "Evaluations", icon: ClipboardList, href: "/hr/career-evaluations", isSubItem: true },
            { label: "Promotions", icon: Award, href: "/hr/career-promotions", isSubItem: true },
          ],
        },
        {
          label: "HR – Compensation",
          defaultCollapsed: true,
          routes: [
            { label: "Bonuses", icon: Gift, href: "/hr/bonuses" },
            { label: "Incentives", icon: Coins, href: "/hr/incentives" },
          ],
        },
        {
          label: "Recruitment",
          routes: [
            { label: "Recruitment Hub", icon: UserSearch, href: "/hr/recruitment" },
            { label: "Jobs", icon: Briefcase, href: "/hr/recruitment/jobs", isSubItem: true },
            { label: "Candidates", icon: Users, href: "/hr/recruitment/candidates", isSubItem: true },
            { label: "Pipeline", icon: TrendingUp, href: "/hr/recruitment/pipeline", isSubItem: true },
            { label: "Interviews", icon: Video, href: "/hr/recruitment/interviews", isSubItem: true },
            { label: "Question Bank", icon: BookOpen, href: "/hr/recruitment/question-bank", isSubItem: true },
            { label: "Hiring Flows", icon: LayoutTemplate, href: "/hr/recruitment/hiring-flows", isSubItem: true },
          ],
        },
        {
          label: "Projects & Time",
          routes: [
            { label: "All Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            { label: "Templates", icon: LayoutTemplate, href: "/projects/templates", isSubItem: true },
            { label: "Resource Allocation", icon: Users, href: "/projects/resource-allocation", isSubItem: true },
          ],
        },
        {
          label: "System",
          routes: [
            { label: "Settings", icon: Settings, href: "/settings" },
            { label: "Organization", icon: Building2, href: "/settings/organization", isSubItem: true },
            { label: "Members", icon: UserCog, href: "/settings/members", isSubItem: true },
            { label: "Data Hub", icon: FileText, href: "/settings/data-hub", isSubItem: true },
            { label: "Recruitment Integrations", icon: Globe, href: "/settings/integrations/recruitment", isSubItem: true },
            { label: "Job office locations", icon: MapPin, href: "/settings/job-office-locations", isSubItem: true },
            { label: "Job Roles", icon: Briefcase, href: "/settings/job-roles", isSubItem: true },
            { label: "Payroll Schedule", icon: CalendarRange, href: "/settings/payroll-schedule", isSubItem: true },
            { label: "Termination Reasons", icon: UserX, href: "/settings/termination-reasons", isSubItem: true },
            { label: "Notifications", icon: Bell, href: "/settings/notifications", isSubItem: true },
          ],
        },
      ];

    case "SALES":
      return [
        {
          label: "Core",
          routes: [
            { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
            { label: "Calendar", icon: CalendarDays, href: "/calendar" },
            { label: "Notifications", icon: Bell, href: "/notifications" },
          ],
        },
        {
          label: "My Work",
          routes: [
            { label: "My Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            { label: "Work Logs", icon: History, href: "/hr/work-logs" },
          ],
        },
        {
          label: "My HR",
          defaultCollapsed: true,
          routes: [
            { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
            { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
            { label: "My Bonuses", icon: Gift, href: "/hr/my-bonuses" },
            { label: "My Assets", icon: Package, href: "/hr/my-assets" },
            { label: "Career Ladders", icon: TrendingUp, href: "/hr/career-ladders" },
            { label: "Holidays", icon: CalendarDays, href: "/hr/holidays" },
            { label: "Exit", icon: UserMinus, href: "/hr/exit" },
            { label: "Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk" },
          ],
        },
      ];

    case "CUSTOMER_SUPPORT":
      return [
        {
          label: "Core",
          routes: [
            { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
            { label: "Calendar", icon: CalendarDays, href: "/calendar" },
            { label: "Notifications", icon: Bell, href: "/notifications" },
          ],
        },
        {
          label: "Helpdesk",
          routes: [
            { label: "All Tickets", icon: LifeBuoy, href: "/support" },
            { label: "Support Inbox", icon: Inbox, href: "/support/inbox", isSubItem: true },
          ],
        },
        {
          label: "My Work",
          routes: [
            { label: "My Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            { label: "Work Logs", icon: History, href: "/hr/work-logs" },
          ],
        },
        {
          label: "My HR",
          defaultCollapsed: true,
          routes: [
            { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
            { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
            { label: "My Bonuses", icon: Gift, href: "/hr/my-bonuses" },
            { label: "My Assets", icon: Package, href: "/hr/my-assets" },
            { label: "Career Ladders", icon: TrendingUp, href: "/hr/career-ladders" },
            { label: "Holidays", icon: CalendarDays, href: "/hr/holidays" },
            { label: "Exit", icon: UserMinus, href: "/hr/exit" },
            { label: "Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk" },
          ],
        },
      ];

    case "DIGITAL_MARKETING":
      return [
        {
          label: "Core",
          routes: [
            { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
            { label: "Calendar", icon: CalendarDays, href: "/calendar" },
            { label: "Notifications", icon: Bell, href: "/notifications" },
          ],
        },
        {
          label: "My Work",
          routes: [
            { label: "My Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            { label: "Work Logs", icon: History, href: "/hr/work-logs" },
          ],
        },
        {
          label: "My HR",
          defaultCollapsed: true,
          routes: [
            { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
            { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
            { label: "My Bonuses", icon: Gift, href: "/hr/my-bonuses" },
            { label: "My Assets", icon: Package, href: "/hr/my-assets" },
            { label: "Career Ladders", icon: TrendingUp, href: "/hr/career-ladders" },
            { label: "Holidays", icon: CalendarDays, href: "/hr/holidays" },
            { label: "Exit", icon: UserMinus, href: "/hr/exit" },
            { label: "Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk" },
          ],
        },
      ];

    case "ENGINEERING":
    case "DESIGN":
    case "VIDEO_EDITOR":
      return [
        {
          label: "Core",
          routes: [
            { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
            { label: "Calendar", icon: CalendarDays, href: "/calendar" },
            { label: "Notifications", icon: Bell, href: "/notifications" },
          ],
        },
        {
          label: "My Work",
          routes: [
            { label: "My Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            { label: "Work Logs", icon: History, href: "/hr/work-logs" },
            { label: "Support", icon: LifeBuoy, href: "/support" },
          ],
        },
        {
          label: "My HR",
          defaultCollapsed: true,
          routes: [
            { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
            { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
            { label: "My Bonuses", icon: Gift, href: "/hr/my-bonuses" },
            { label: "My Assets", icon: Package, href: "/hr/my-assets" },
            { label: "Career Ladders", icon: TrendingUp, href: "/hr/career-ladders" },
            { label: "Holidays", icon: CalendarDays, href: "/hr/holidays" },
            { label: "Exit", icon: UserMinus, href: "/hr/exit" },
            { label: "Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk" },
          ],
        },
      ];

    default:
      return [
        {
          label: "Core",
          routes: [
            { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
            { label: "Calendar", icon: CalendarDays, href: "/calendar" },
            { label: "Notifications", icon: Bell, href: "/notifications" },
          ],
        },
        {
          label: "My Work",
          routes: [
            { label: "My Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            { label: "Work Logs", icon: History, href: "/hr/work-logs" },
            { label: "Support", icon: LifeBuoy, href: "/support" },
          ],
        },
        {
          label: "My HR",
          defaultCollapsed: true,
          routes: [
            { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
            { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
            { label: "My Bonuses", icon: Gift, href: "/hr/my-bonuses" },
            { label: "My Assets", icon: Package, href: "/hr/my-assets" },
            { label: "Career Ladders", icon: TrendingUp, href: "/hr/career-ladders" },
            { label: "Holidays", icon: CalendarDays, href: "/hr/holidays" },
            { label: "Exit", icon: UserMinus, href: "/hr/exit" },
            { label: "Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk" },
          ],
        },
      ];
  }
}

/** Strip query/hash so pathname matching works for links like `/hr/onboarding?tab=workflow`. */
export function navHrefPath(href: string): string {
  const q = href.indexOf("?");
  const base = q === -1 ? href : href.slice(0, q);
  const hash = base.indexOf("#");
  return hash === -1 ? base : base.slice(0, hash);
}

export function pathnameMatchesNavPath(navPath: string, pathname: string): boolean {
  return pathname === navPath || pathname.startsWith(`${navPath}/`);
}

/** Longest matching nav path wins so a short prefix (e.g. `/hr`) does not stay active on deeper HR routes. */
export function getLongestMatchingNavPath(
  pathname: string,
  navGroups: NavGroup[],
): string | null {
  let best: string | null = null;
  for (const group of navGroups) {
    for (const route of group.routes) {
      const p = navHrefPath(route.href);
      if (!pathnameMatchesNavPath(p, pathname)) continue;
      if (!best || p.length > best.length) best = p;
    }
  }
  return best;
}
