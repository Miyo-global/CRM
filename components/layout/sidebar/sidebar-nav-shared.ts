import type { NavGroup, NavRoute, NavSubGroup } from "./sidebar-nav-types";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Settings,
  Clock,
  CalendarCheck,
  CalendarDays,
  Receipt,
  FileText,
  QrCode,
  DollarSign,
  Handshake,
  Contact2,
  Trophy,
  BarChart3,
  UserCheck,
  Network,
  ClipboardList,
  MessageSquareText,
  Shield,
  ShieldCheck,
  CreditCard,
  Wallet,
  Star,
  HeadphonesIcon,
  UserSearch,
  TrendingUp,
  BookOpen,
  Heart,
  UserMinus,
  Target,
  Megaphone,
  Mail,
  Package,
  Share2,
  Video,
  Globe,
  Bell,
  Gift,
  MailOpen,
  Coins,
  Zap,
  History,
  BarChart2,
  LifeBuoy,
  Inbox,
  GitBranch,
  Building2,
  UserCog,
  SlidersHorizontal,
  UserX,
  Activity,
  FlaskConical,
  Sparkles,
  Brain,
  Copy,
  Search,
  ShieldAlert,
  Sliders,
  FormInput,
  CalendarRange,
  FileSearch,
  LayoutTemplate,
  Grid3X3,
  PackageMinus,
  FileCheck,
  Map,
  MapPin,
  RefreshCcw,
  Timer,
} from "lucide-react";

export function coreRoutes(opts?: { includeAdmin?: boolean }): NavRoute[] {
  const routes: NavRoute[] = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { label: "Calendar", icon: CalendarDays, href: "/calendar" },
    { label: "Chat", icon: MessageSquareText, href: "/chat" },
    { label: "Notifications", icon: Bell, href: "/notifications" },
  ];
  if (opts?.includeAdmin) {
    routes.splice(1, 0,
      { label: "System Health", icon: Activity, href: "/dashboard/admin-health" },
      { label: "Branch Center", icon: Building2, href: "/dashboard/branches" },
      { label: "AI Hub", icon: Sparkles, href: "/ai" },
      { label: "QR Codes", icon: QrCode, href: "/ceo/qr-code" },
    );
  }
  return routes;
}

export const myHrSubGroup = (collapsed = true): NavSubGroup => ({
  label: "Personal HR",
  defaultCollapsed: collapsed,
  routes: [
    { label: "My Leaves", icon: CalendarCheck, href: "/hr/leaves" },
    { label: "My Expenses", icon: Receipt, href: "/hr/expenses" },
    { label: "My Attendance", icon: Clock, href: "/hr/attendance" },
    { label: "My Payslips", icon: Wallet, href: "/hr/my-payslips" },
    { label: "My Bonuses", icon: Gift, href: "/hr/my-bonuses" },
    { label: "My Assets", icon: Package, href: "/hr/my-assets" },
    { label: "Exit", icon: UserMinus, href: "/hr/exit" },
    { label: "Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk" },
  ],
});

export const myWorkRoutes: NavRoute[] = [
  { label: "My Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
  { label: "Work Logs", icon: History, href: "/hr/work-logs" },
];

export function hrPeopleSubGroups(): NavSubGroup[] {
  return [
    {
      label: "Directory",
      routes: [
        { label: "Employees", icon: Users, href: "/hr" },
        { label: "Skills Matrix", icon: Grid3X3, href: "/hr/employees/skills-matrix", isSubItem: true },
        { label: "Terminated", icon: UserX, href: "/hr/employees/terminated", isSubItem: true },
        { label: "Find Expert", icon: Search, href: "/hr/employees/find-expert", isSubItem: true },
        { label: "Org Chart", icon: Network, href: "/hr/org-chart", isSubItem: true },
      ],
    },
    {
      label: "Onboarding",
      routes: [
        { label: "Onboarding", icon: ClipboardList, href: "/hr/onboarding?tab=workflow" },
        { label: "Doc Types", icon: FileCheck, href: "/hr/document-types", isSubItem: true },
        { label: "Doc Review", icon: FileText, href: "/hr/document-review", isSubItem: true },
        { label: "Offer Templates", icon: FileText, href: "/hr/offer-letter-templates", isSubItem: true },
      ],
    },
    {
      label: "Time & Leave",
      routes: [
        { label: "Attendance", icon: Clock, href: "/hr/attendance" },
        { label: "Leaves", icon: CalendarCheck, href: "/hr/leaves", badge: "leaves" },
        { label: "Work Logs", icon: History, href: "/hr/work-logs", isSubItem: true },
      ],
    },
    {
      label: "Payroll & Expenses",
      routes: [
        { label: "Payroll", icon: CreditCard, href: "/hr/payroll" },
        { label: "Expenses", icon: Receipt, href: "/hr/expenses" },
      ],
    },
    {
      label: "Documents & Assets",
      routes: [
        { label: "Documents", icon: FileText, href: "/hr/documents" },
        { label: "Handbook", icon: BookOpen, href: "/hr/handbook", isSubItem: true },
        { label: "Assets", icon: Package, href: "/hr/assets" },
        { label: "Asset Returns", icon: PackageMinus, href: "/hr/asset-returns", isSubItem: true },
      ],
    },
    {
      label: "Exit & Support",
      defaultCollapsed: true,
      routes: [
        { label: "Exit", icon: UserMinus, href: "/hr/exit" },
        { label: "Termination", icon: UserX, href: "/hr/termination", isSubItem: true },
        { label: "Helpdesk", icon: HeadphonesIcon, href: "/hr/helpdesk" },
        { label: "Support Tickets", icon: LifeBuoy, href: "/support", isSubItem: true },
        { label: "Support Inbox", icon: Inbox, href: "/support/inbox", isSubItem: true },
        { label: "Email Templates", icon: MailOpen, href: "/hr/email-templates", isSubItem: true },
      ],
    },
    {
      label: "Analytics",
      routes: [{ label: "HR Analytics", icon: BarChart3, href: "/hr/analytics" }],
    },
  ];
}

export function recruitmentGroup(): NavGroup {
  return {
    label: "Recruitment",
    defaultCollapsed: false,
    subGroups: [
      {
        label: "Hiring",
        routes: [
          { label: "Recruitment Hub", icon: UserSearch, href: "/hr/recruitment" },
          { label: "Jobs", icon: Briefcase, href: "/hr/recruitment/jobs", isSubItem: true },
          { label: "Candidates", icon: Users, href: "/hr/recruitment/candidates", isSubItem: true },
          { label: "Pipeline", icon: TrendingUp, href: "/hr/recruitment/pipeline", isSubItem: true },
          { label: "Interviews", icon: Video, href: "/hr/recruitment/interviews", isSubItem: true },
        ],
      },
    ],
  };
}

export function crmGroups(fullCeo = false): NavGroup[] {
  const leadsSub: NavSubGroup = {
    label: "Leads",
    routes: [
      { label: "CRM Hub", icon: Contact2, href: "/crm" },
      { label: "Lead Pipeline", icon: Contact2, href: "/crm/leads" },
      { label: "Smart Search", icon: Search, href: "/crm/leads/smart-search", isSubItem: true },
      ...(fullCeo
        ? [
            { label: "Distribute Leads", icon: Share2, href: "/crm/leads/distribute", isSubItem: true },
            { label: "Source Report", icon: BarChart2, href: "/crm/leads/source-report", isSubItem: true },
            { label: "Duplicates", icon: Copy, href: "/crm/leads/duplicates", isSubItem: true },
          ]
        : [
            { label: "Distribute Leads", icon: Share2, href: "/crm/leads/distribute", isSubItem: true },
            { label: "Duplicates", icon: Copy, href: "/crm/leads/duplicates", isSubItem: true },
          ]),
    ],
  };

  const dealsSub: NavSubGroup = {
    label: "Deals",
    routes: [
      { label: "Deals", icon: Handshake, href: "/crm/deals" },
      ...(fullCeo
        ? [
            { label: "Approvals", icon: Briefcase, href: "/crm/deals/approvals", isSubItem: true },
            { label: "Deal Aging", icon: Clock, href: "/crm/deals/aging", isSubItem: true },
            { label: "Win/Loss", icon: TrendingUp, href: "/crm/deals/win-loss", isSubItem: true },
          ]
        : []),
    ],
  };

  const accountsSub: NavSubGroup = {
    label: "Accounts",
    routes: [
      { label: "Organizations", icon: Network, href: "/crm/organizations" },
      { label: "Clients", icon: UserCheck, href: "/crm/clients" },
      { label: "Territories", icon: Map, href: "/crm/territories", isSubItem: true },
      { label: "Targets", icon: Trophy, href: "/crm/targets" },
      { label: "Quotes", icon: FileText, href: "/crm/quotes" },
    ],
  };

  const insightsSub: NavSubGroup = {
    label: "Insights",
    defaultCollapsed: true,
    routes: [
      { label: "Analytics", icon: BarChart3, href: "/crm/analytics" },
      { label: "CRM Reports", icon: BarChart2, href: "/crm/reports" },
      ...(fullCeo ? [{ label: "Web Forms", icon: FormInput, href: "/crm/web-forms", isSubItem: true }] : []),
    ],
  };

  const groups: NavGroup[] = [
    {
      label: "CRM",
      subGroups: [leadsSub, dealsSub, accountsSub, insightsSub],
    },
  ];

  if (fullCeo) {
    groups.push({
      label: "CRM Settings",
      defaultCollapsed: true,
      subGroups: [
        {
          label: "Automation",
          routes: [
            { label: "Assignment Rules", icon: SlidersHorizontal, href: "/crm/settings/assignment-rules" },
            { label: "Scoring Rules", icon: Star, href: "/crm/settings/scoring-rules" },
            { label: "SLA Rules", icon: Clock, href: "/crm/settings/sla" },
            { label: "Email Templates", icon: MailOpen, href: "/crm/settings/email-templates" },
          ],
        },
      ],
    });
  }

  return groups;
}

export function salesRevenueGroup(): NavGroup {
  return {
    label: "Sales",
    subGroups: [
      {
        label: "Dashboard",
        routes: [
          { label: "Sales Hub", icon: BarChart3, href: "/sales" },
          { label: "Activity", icon: Activity, href: "/sales/activity", isSubItem: true },
          { label: "Forecast", icon: TrendingUp, href: "/sales/forecast-report", isSubItem: true },
          { label: "Quotas", icon: Target, href: "/sales/quotas", isSubItem: true },
          { label: "Commissions", icon: DollarSign, href: "/sales/commissions", isSubItem: true },
          { label: "Cohort Analysis", icon: BarChart3, href: "/sales/cohort-analysis", isSubItem: true },
          { label: "Rep Comparison", icon: Users, href: "/sales/rep-comparison", isSubItem: true },
        ],
      },
      {
        label: "Tools",
        defaultCollapsed: true,
        routes: [
          { label: "Playbook", icon: BookOpen, href: "/sales/playbook", isSubItem: true },
          { label: "AI Sales Tools", icon: Sparkles, href: "/sales/ai-tools", isSubItem: true },
          { label: "Report Narrator", icon: FileSearch, href: "/sales/report-narrator", isSubItem: true },
          { label: "Meeting Prep", icon: CalendarCheck, href: "/sales/meeting-prep", isSubItem: true },
        ],
      },
    ],
  };
}

export function customerSuccessGroup(): NavGroup {
  return {
    label: "Customer Success",
    defaultCollapsed: true,
    subGroups: [
      {
        label: "Accounts",
        routes: [
          { label: "Customer Hub", icon: Handshake, href: "/customer-executive" },
          { label: "Renewals", icon: RefreshCcw, href: "/customer-executive/renewals", isSubItem: true },
          { label: "Upsell Tracker", icon: TrendingUp, href: "/customer-executive/upsell", isSubItem: true },
          { label: "Client Onboarding", icon: ClipboardList, href: "/customer-executive/client-onboarding", isSubItem: true },
        ],
      },
      {
        label: "Quality",
        defaultCollapsed: true,
        routes: [
          { label: "CSAT Surveys", icon: Star, href: "/customer-executive/surveys", isSubItem: true },
          { label: "Sentiment", icon: Brain, href: "/customer-executive/sentiment", isSubItem: true },
          { label: "SLA Compliance", icon: ShieldAlert, href: "/customer-executive/sla", isSubItem: true },
          { label: "Account Summary", icon: FileText, href: "/customer-executive/account-summary", isSubItem: true },
        ],
      },
    ],
  };
}

export function marketingGroup(): NavGroup {
  return {
    label: "Marketing",
    defaultCollapsed: true,
    subGroups: [
      {
        label: "Campaigns",
        routes: [
          { label: "Marketing Hub", icon: Megaphone, href: "/marketing" },
          { label: "Campaigns", icon: Megaphone, href: "/marketing/campaigns", isSubItem: true },
          { label: "Email Campaigns", icon: Mail, href: "/marketing/email-campaigns", isSubItem: true },
          { label: "A/B Testing", icon: FlaskConical, href: "/marketing/ab-testing", isSubItem: true },
        ],
      },
      {
        label: "Content",
        defaultCollapsed: true,
        routes: [
          { label: "Marketing Calendar", icon: CalendarDays, href: "/marketing/calendar", isSubItem: true },
          { label: "Content Calendar", icon: CalendarRange, href: "/marketing/content-calendar", isSubItem: true },
          { label: "Landing Pages", icon: BarChart2, href: "/marketing/landing-pages", isSubItem: true },
          { label: "Content Brief", icon: FileText, href: "/marketing/content-brief", isSubItem: true },
          { label: "Social Analytics", icon: BarChart2, href: "/marketing/social-analytics", isSubItem: true },
          { label: "AI Insights", icon: Sparkles, href: "/marketing/ai-insights", isSubItem: true },
        ],
      },
      {
        label: "Digital",
        defaultCollapsed: true,
        routes: [
          { label: "Digital Hub", icon: BarChart3, href: "/digital-marketing" },
          { label: "Digital Campaigns", icon: Megaphone, href: "/digital-marketing/campaigns", isSubItem: true },
          { label: "Digital Leads", icon: Contact2, href: "/digital-marketing/leads", isSubItem: true },
          { label: "Social", icon: Globe, href: "/digital-marketing/social", isSubItem: true },
        ],
      },
    ],
  };
}

export function projectsGroup(includeTeamTimesheets = false): NavGroup {
  return {
    label: "Projects",
    routes: [
      { label: "All Projects", icon: Briefcase, href: "/projects", isProjectsList: true },
      { label: "Templates", icon: LayoutTemplate, href: "/projects/templates", isSubItem: true },
      { label: "Resource Allocation", icon: Users, href: "/projects/resource-allocation", isSubItem: true },
      ...(includeTeamTimesheets
        ? [{ label: "Team Timesheets", icon: Timer, href: "/timesheets/team" }]
        : []),
    ],
  };
}

export function systemAdminGroup(fullCeo = false): NavGroup {
  return {
    label: "Administration",
    defaultCollapsed: true,
    subGroups: [
      {
        label: "Organization",
        routes: [
          { label: "Settings", icon: Settings, href: "/settings" },
          { label: "Organization", icon: Building2, href: "/settings/organization", isSubItem: true },
          { label: "Members", icon: UserCog, href: "/settings/members", isSubItem: true },
          { label: "Job office locations", icon: MapPin, href: "/settings/job-office-locations", isSubItem: true },
          { label: "Job Roles", icon: Briefcase, href: "/settings/job-roles", isSubItem: true },
        ],
      },
      {
        label: "Security",
        routes: [
          { label: "Roles & Permissions", icon: Shield, href: "/settings/roles" },
          { label: "Permission Matrix", icon: ShieldAlert, href: "/settings/permissions", isSubItem: true },
          { label: "Audit Log", icon: ShieldCheck, href: "/settings/audit-log", isSubItem: true },
        ],
      },
      {
        label: "Platform",
        defaultCollapsed: true,
        routes: [
          { label: "Webhooks", icon: Zap, href: "/settings/webhooks" },
          { label: "AI Settings", icon: Brain, href: "/settings/ai" },
          { label: "Notifications", icon: Bell, href: "/settings/notifications", isSubItem: true },
          { label: "Custom Fields", icon: Sliders, href: "/settings/custom-fields", isSubItem: true },
          { label: "Data Hub", icon: FileText, href: "/settings/data-hub" },
          { label: "Recruitment Integrations", icon: Globe, href: "/settings/integrations/recruitment", isSubItem: true },
          ...(fullCeo ? [{ label: "Reports", icon: BarChart2, href: "/reports" }] : []),
        ],
      },
    ],
  };
}

export function billingGroup(): NavGroup {
  return {
    label: "Billing",
    defaultCollapsed: true,
    routes: [
      { label: "Billing", icon: CreditCard, href: "/billing" },
      { label: "Invoices", icon: FileText, href: "/billing/invoices", isSubItem: true },
    ],
  };
}

export function talentGrowthGroup(): NavGroup {
  return {
    label: "Talent & Growth",
    defaultCollapsed: true,
    routes: [
      { label: "Performance", icon: Star, href: "/hr/performance" },
      { label: "Recognition", icon: Heart, href: "/hr/recognition" },
      { label: "Career Ladders", icon: TrendingUp, href: "/hr/career-ladders" },
    ],
  };
}

export function compensationGroup(): NavGroup {
  return {
    label: "Compensation",
    defaultCollapsed: true,
    routes: [
      { label: "Bonuses", icon: Gift, href: "/hr/bonuses" },
      { label: "Incentives", icon: Coins, href: "/hr/incentives" },
    ],
  };
}
