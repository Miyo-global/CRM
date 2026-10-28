

import { CalendarClock, LayoutDashboard, Users, Briefcase, Settings, Clock, CalendarCheck, CalendarDays, Receipt, FileText, Timer, QrCode, BarChart3, UserCheck, Network, ClipboardList, Shield, ShieldCheck, CreditCard, Wallet, Star, HeadphonesIcon, TrendingUp, BookOpen, Heart, UserMinus, Package, Bell, PackageMinus, Gift, Award, MailOpen, FileCheck, Coins, Map, Zap, ListChecks, History, BarChart2, LifeBuoy, Inbox, Building, Building2, UserCog, UserX, Activity, Sparkles, Brain, Search, ShieldAlert, CalendarRange, LayoutTemplate, Grid3X3, UserPlus, Library, ArrowDownUp } from "lucide-react";

import { AI_MODULE_ENABLED, ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { ROLE_DEFAULT_PERMISSIONS } from "@/lib/rbac/permissions";

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

/**
 * KB-0065: the Knowledge module.
 *
 * Every role gets the wiki — what someone can actually read is decided by space
 * and page access inside, not by the menu. The manage group is added only for
 * roles whose defaults hold the matching permission; the API checks it again.
 *
 * Search, Ask KB, Analytics, Content Health, Company documents and KB settings
 * join these groups as their pages land (Phases F to J).
 */
function knowledgeWikiGroup(): NavGroup {
  return {
    label: "Knowledge – Wiki",
    routes: [
      { label: "Wiki", icon: BookOpen, href: "/knowledge/wiki" },
      { label: "My pages", icon: FileText, href: "/knowledge/wiki/private", isSubItem: true },
      { label: "Shared with me", icon: Users, href: "/knowledge/wiki/shared", isSubItem: true },
      { label: "Spaces", icon: Library, href: "/knowledge/wiki/spaces", isSubItem: true },
      { label: "Templates", icon: LayoutTemplate, href: "/knowledge/wiki/templates", isSubItem: true },
    ],
  };
}

function knowledgeManageGroup(role: string): NavGroup[] {
  const granted = ROLE_DEFAULT_PERMISSIONS[role] ?? [];
  const routes: NavRoute[] = [];

  if (granted.includes("kb:reviews:view") || granted.includes("kb:reviews:manage")) {
    routes.push({ label: "Reviews", icon: FileCheck, href: "/knowledge/wiki/reviews" });
  }
  // Export alone is every employee's (one page at a time, from the page), so
  // the import-and-export screen is offered only to roles that can import.
  if (granted.includes("kb:pages:import")) {
    routes.push({ label: "Import & Export", icon: ArrowDownUp, href: "/knowledge/wiki/import" });
  }

  return routes.length > 0 ? [{ label: "Knowledge – Manage", defaultCollapsed: true, routes }] : [];
}

/**
 * KB-0065: the Knowledge groups go in for every role, straight after Core, so
 * the wiki sits where people look for it instead of at the bottom of whatever
 * each role's menu happens to end with.
 */
export function getNavGroupsForRole(role: string | undefined): NavGroup[] {
  if (!role) return [];

  const groups = roleNavGroups(role);
  if (groups.length === 0) return groups;

  const afterCore = groups[0]?.label === "Core" ? 1 : 0;
  return [
    ...groups.slice(0, afterCore),
    knowledgeWikiGroup(),
    ...knowledgeManageGroup(role),
    ...groups.slice(afterCore),
  ];
}

function roleNavGroups(role: string): NavGroup[] {
  switch (role) {
    case "CEO":
    case "ADMIN":
      return [
        {
          label: "Core",
          routes: [
            { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
            { label: "Admin Summary", icon: Activity, href: "/dashboard/admin-health" },
            ...(AI_MODULE_ENABLED ? [{ label: "AI Hub", icon: Sparkles, href: "/ai" }] : []),
            { label: "Calendar", icon: CalendarDays, href: "/calendar" },
            { label: "QR Codes", icon: QrCode, href: "/tools/qr-code" },
            { label: "Notifications", icon: Bell, href: "/notifications" },
          ],
        },
        // MIYO-0631: the ATS ships behind NEXT_PUBLIC_ATS_MODULE.
        ...(ATS_MODULE_ENABLED
          ? [
              {
                label: "Hiring",
                routes: [
                  { label: "Hiring", icon: UserPlus, href: "/ats" },
                  { label: "Requisitions", icon: ClipboardList, href: "/ats/requisitions", isSubItem: true },
                  { label: "Jobs", icon: Briefcase, href: "/ats/jobs", isSubItem: true },
                  { label: "Candidates", icon: Users, href: "/ats/candidates", isSubItem: true },
                  { label: "Interviews", icon: CalendarCheck, href: "/ats/interviews", isSubItem: true },
                ],
              },
            ]
          : []),
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
            { label: "Shifts", icon: CalendarClock, href: "/hr/shifts", isSubItem: true },
            { label: "Leaves", icon: CalendarCheck, href: "/hr/leaves", badge: "leaves" },
            { label: "Leave policy", icon: BookOpen, href: "/hr/leaves/policies", isSubItem: true },
            { label: "Payroll", icon: CreditCard, href: "/hr/payroll" },
            { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips", isSubItem: true },
            { label: "My Bonuses", icon: Gift, href: "/hr/my-bonuses", isSubItem: true },
            { label: "My Assets", icon: Package, href: "/hr/my-assets", isSubItem: true },
            { label: "Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "Reimbursements", icon: Coins, href: "/hr/reimbursements", isSubItem: true },
            { label: "Loans", icon: Wallet, href: "/hr/loans", isSubItem: true },
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
            { label: "HR Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk" },
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
          ],
        },
        // Customer Support is its own top-nav module, not part of HR (P2-support-not-in-top-nav).
        {
          label: "Customer Support",
          routes: [
            { label: "Customer Support", icon: LifeBuoy, href: "/support" },
            { label: "Customer Support Inbox", icon: Inbox, href: "/support/inbox", isSubItem: true },
          ],
        },
        {
          label: "Projects & Time",
          routes: [
            { label: "All Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            { label: "My Work", icon: ListChecks, href: "/projects/my-work", isSubItem: true },
            { label: "Roadmap", icon: Map, href: "/projects/roadmap", isSubItem: true },
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
            { label: "Roles & Permissions", icon: Shield, href: "/settings/roles" },
            { label: "Permission Matrix", icon: ShieldAlert, href: "/settings/permissions", isSubItem: true },
            { label: "Audit Log", icon: ShieldCheck, href: "/settings/audit-log" },
            { label: "Email Log", icon: MailOpen, href: "/settings/email-log", isSubItem: true },
            { label: "Webhooks", icon: Zap, href: "/settings/webhooks" },
            { label: "AI Settings", icon: Brain, href: "/settings/ai" },
            { label: "Notifications", icon: Bell, href: "/settings/notifications", isSubItem: true },
            { label: "Data Export", icon: FileText, href: "/settings/data-hub" },
            { label: "Job Roles", icon: Briefcase, href: "/settings/job-roles", isSubItem: true },
            { label: "Payroll Schedule", icon: CalendarRange, href: "/settings/payroll-schedule", isSubItem: true },
            { label: "Termination Reasons", icon: UserX, href: "/settings/termination-reasons", isSubItem: true },
            { label: "Departments", icon: Building, href: "/settings/departments", isSubItem: true },
            { label: "Appraisal Categories", icon: ClipboardList, href: "/settings/appraisal-categories", isSubItem: true },
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
            ...(AI_MODULE_ENABLED ? [{ label: "AI Hub", icon: Sparkles, href: "/ai" }] : []),
            { label: "Calendar", icon: CalendarDays, href: "/calendar" },
            { label: "Notifications", icon: Bell, href: "/notifications" },
          ],
        },
        // MIYO-0631: the ATS ships behind NEXT_PUBLIC_ATS_MODULE.
        ...(ATS_MODULE_ENABLED
          ? [
              {
                label: "Hiring",
                routes: [
                  { label: "Hiring", icon: UserPlus, href: "/ats" },
                  { label: "Requisitions", icon: ClipboardList, href: "/ats/requisitions", isSubItem: true },
                  { label: "Jobs", icon: Briefcase, href: "/ats/jobs", isSubItem: true },
                  { label: "Candidates", icon: Users, href: "/ats/candidates", isSubItem: true },
                  { label: "Interviews", icon: CalendarCheck, href: "/ats/interviews", isSubItem: true },
                ],
              },
            ]
          : []),
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
            { label: "Shifts", icon: CalendarClock, href: "/hr/shifts", isSubItem: true },
            { label: "Leaves", icon: CalendarCheck, href: "/hr/leaves", badge: "leaves" },
            { label: "Leave policy", icon: BookOpen, href: "/hr/leaves/policies", isSubItem: true },
            { label: "Payroll", icon: CreditCard, href: "/hr/payroll" },
            { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips", isSubItem: true },
            { label: "My Bonuses", icon: Gift, href: "/hr/my-bonuses", isSubItem: true },
            { label: "My Assets", icon: Package, href: "/hr/my-assets", isSubItem: true },
            { label: "Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "Reimbursements", icon: Coins, href: "/hr/reimbursements", isSubItem: true },
            { label: "Loans", icon: Wallet, href: "/hr/loans", isSubItem: true },
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
            { label: "HR Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk" },
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
          ],
        },
        // Customer Support is its own top-nav module, not part of HR (P2-support-not-in-top-nav).
        {
          label: "Customer Support",
          routes: [
            { label: "Customer Support", icon: LifeBuoy, href: "/support" },
            { label: "Customer Support Inbox", icon: Inbox, href: "/support/inbox", isSubItem: true },
          ],
        },
        {
          label: "Projects & Time",
          routes: [
            { label: "All Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            { label: "My Work", icon: ListChecks, href: "/projects/my-work", isSubItem: true },
            { label: "Roadmap", icon: Map, href: "/projects/roadmap", isSubItem: true },
            { label: "Templates", icon: LayoutTemplate, href: "/projects/templates", isSubItem: true },
            { label: "Resource Allocation", icon: Users, href: "/projects/resource-allocation", isSubItem: true },
          ],
        },
        {
          label: "System",
          routes: [
            { label: "Settings", icon: Settings, href: "/settings" },
            // Organization, Data Export and System Health are Super Admin / Admin only.
            { label: "Members", icon: UserCog, href: "/settings/members", isSubItem: true },
            { label: "Job Roles", icon: Briefcase, href: "/settings/job-roles", isSubItem: true },
            { label: "Payroll Schedule", icon: CalendarRange, href: "/settings/payroll-schedule", isSubItem: true },
            { label: "Termination Reasons", icon: UserX, href: "/settings/termination-reasons", isSubItem: true },
            { label: "Departments", icon: Building, href: "/settings/departments", isSubItem: true },
            { label: "Appraisal Categories", icon: ClipboardList, href: "/settings/appraisal-categories", isSubItem: true },
            { label: "Notifications", icon: Bell, href: "/settings/notifications", isSubItem: true },
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
          label: "Customer Support",
          routes: [
            { label: "Customer Support", icon: LifeBuoy, href: "/support" },
            { label: "Customer Support Inbox", icon: Inbox, href: "/support/inbox", isSubItem: true },
          ],
        },
        {
          label: "My Work",
          routes: [
            { label: "My Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
            { label: "My Work", icon: ListChecks, href: "/projects/my-work", isSubItem: true },
            { label: "Roadmap", icon: Map, href: "/projects/roadmap", isSubItem: true },
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
            { label: "My Documents", icon: FileText, href: "/hr/my-documents" },
            { label: "My Reimbursements", icon: Coins, href: "/hr/reimbursements" },
            { label: "My Loans", icon: Wallet, href: "/hr/loans" },
            { label: "Career Ladders", icon: TrendingUp, href: "/hr/career-ladders" },
            { label: "Holidays", icon: CalendarDays, href: "/hr/holidays" },
            { label: "Handbook", icon: BookOpen, href: "/hr/handbook" },
            { label: "Recognition", icon: Heart, href: "/hr/recognition" },
            { label: "My Reviews", icon: Star, href: "/hr/my-reviews" },
            { label: "Exit", icon: UserMinus, href: "/hr/exit" },
            { label: "HR Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk" },
          ],
        },
      ];

    case "RECRUITER":
      return [
        {
          label: "Core",
          routes: [
            { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
            { label: "Calendar", icon: CalendarDays, href: "/calendar" },
            { label: "Notifications", icon: Bell, href: "/notifications" },
          ],
        },
        ...(ATS_MODULE_ENABLED
          ? [
              {
                label: "Hiring",
                routes: [
                  { label: "Hiring", icon: UserPlus, href: "/ats" },
                  { label: "Requisitions", icon: ClipboardList, href: "/ats/requisitions", isSubItem: true },
                  { label: "Jobs", icon: Briefcase, href: "/ats/jobs", isSubItem: true },
                  { label: "Candidates", icon: Users, href: "/ats/candidates", isSubItem: true },
                  { label: "Interviews", icon: CalendarCheck, href: "/ats/interviews", isSubItem: true },
                ],
              },
            ]
          : []),
        {
          label: "My HR",
          defaultCollapsed: true,
          routes: [
            { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
            { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
            { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
            { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
            { label: "My Documents", icon: FileText, href: "/hr/my-documents" },
            { label: "Holidays", icon: CalendarDays, href: "/hr/holidays" },
            { label: "Handbook", icon: BookOpen, href: "/hr/handbook" },
            { label: "Recognition", icon: Heart, href: "/hr/recognition" },
            { label: "My Reviews", icon: Star, href: "/hr/my-reviews" },
            { label: "HR Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk" },
          ],
        },
      ];

    case "EMPLOYEE":
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
            { label: "My Work", icon: ListChecks, href: "/projects/my-work", isSubItem: true },
            { label: "Roadmap", icon: Map, href: "/projects/roadmap", isSubItem: true },
            { label: "Work Logs", icon: History, href: "/hr/work-logs" },
            { label: "Timesheets", icon: Timer, href: "/timesheets" },
            // Employees' own HR helpdesk tickets, not the Customer Support inbox (FR1-032).
            { label: "My Support Tickets", icon: LifeBuoy, href: "/hr/helpdesk" },
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
            { label: "My Documents", icon: FileText, href: "/hr/my-documents" },
            { label: "My Reimbursements", icon: Coins, href: "/hr/reimbursements" },
            { label: "My Loans", icon: Wallet, href: "/hr/loans" },
            { label: "Career Ladders", icon: TrendingUp, href: "/hr/career-ladders" },
            { label: "Holidays", icon: CalendarDays, href: "/hr/holidays" },
            { label: "Handbook", icon: BookOpen, href: "/hr/handbook" },
            { label: "Recognition", icon: Heart, href: "/hr/recognition" },
            { label: "My Reviews", icon: Star, href: "/hr/my-reviews" },
            { label: "Exit", icon: UserMinus, href: "/hr/exit" },
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
            { label: "My Work", icon: ListChecks, href: "/projects/my-work", isSubItem: true },
            { label: "Roadmap", icon: Map, href: "/projects/roadmap", isSubItem: true },
            { label: "Work Logs", icon: History, href: "/hr/work-logs" },
            { label: "Timesheets", icon: Timer, href: "/timesheets" },
            // Employees' own HR helpdesk tickets, not the Customer Support inbox (FR1-032).
            { label: "My Support Tickets", icon: LifeBuoy, href: "/hr/helpdesk" },
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
            { label: "My Documents", icon: FileText, href: "/hr/my-documents" },
            { label: "My Reimbursements", icon: Coins, href: "/hr/reimbursements" },
            { label: "My Loans", icon: Wallet, href: "/hr/loans" },
            { label: "Career Ladders", icon: TrendingUp, href: "/hr/career-ladders" },
            { label: "Holidays", icon: CalendarDays, href: "/hr/holidays" },
            { label: "Handbook", icon: BookOpen, href: "/hr/handbook" },
            { label: "Recognition", icon: Heart, href: "/hr/recognition" },
            { label: "My Reviews", icon: Star, href: "/hr/my-reviews" },
            { label: "Exit", icon: UserMinus, href: "/hr/exit" },
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

/**
 * Modules for the top nav (B5). A group label like "HR – People" belongs to
 * the "HR" module, so the top nav lists modules and the sidebar only has to
 * show the groups of the module you are in.
 */
export function moduleOfGroup(groupLabel: string): string {
  return groupLabel.split("–")[0].trim();
}

export interface NavModule {
  label: string;
  /** Where clicking the module in the top nav goes: its first route. */
  href: string;
  groupLabels: string[];
}

export function getModules(navGroups: NavGroup[]): NavModule[] {
  // `Map` here is lucide's icon, not the global, so keep this plain.
  const modules: NavModule[] = [];
  for (const group of navGroups) {
    const label = moduleOfGroup(group.label);
    const existing = modules.find((m) => m.label === label);
    if (existing) {
      existing.groupLabels.push(group.label);
      continue;
    }
    const first = group.routes[0];
    if (!first) continue;
    modules.push({ label, href: first.href, groupLabels: [group.label] });
  }
  return modules;
}

/** The module that owns the current pathname, or null when nothing matches. */
export function getActiveModule(
  pathname: string,
  navGroups: NavGroup[],
): string | null {
  const longest = getLongestMatchingNavPath(pathname, navGroups);
  if (!longest) return null;
  for (const group of navGroups) {
    if (group.routes.some((route) => navHrefPath(route.href) === longest)) {
      return moduleOfGroup(group.label);
    }
  }
  return null;
}
