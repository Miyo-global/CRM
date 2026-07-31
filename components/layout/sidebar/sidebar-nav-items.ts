

import {
  LayoutDashboard, Users, Briefcase, Settings, Clock, CalendarCheck, CalendarDays,
  Receipt, FileText, Timer, QrCode, DollarSign, Handshake,
  Contact2, Trophy, BarChart3, UserCheck, Network, ClipboardList, MessageSquareText,
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
      return [
        {
          label: "Core",
          routes: [
            { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
            { label: "System Health", icon: Activity, href: "/dashboard/admin-health" },
            { label: "Branches", icon: Building2, href: "/dashboard/branches" },
            { label: "AI Hub", icon: Sparkles, href: "/ai" },
            { label: "Calendar", icon: CalendarDays, href: "/calendar" },
            { label: "Chat", icon: MessageSquareText, href: "/chat" },
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
          label: "CRM",
          routes: [
            { label: "CRM Hub", icon: Contact2, href: "/crm" },
            { label: "Lead Pipeline", icon: Contact2, href: "/crm/leads" },
            { label: "Smart Search", icon: Search, href: "/crm/leads/smart-search", isSubItem: true },
            { label: "Distribute Leads", icon: Share2, href: "/crm/leads/distribute", isSubItem: true },
            { label: "Source Report", icon: BarChart2, href: "/crm/leads/source-report", isSubItem: true },
            { label: "Duplicate Detection", icon: Copy, href: "/crm/leads/duplicates", isSubItem: true },
            { label: "Deals", icon: Handshake, href: "/crm/deals" },
            { label: "Deal Approvals", icon: Briefcase, href: "/crm/deals/approvals", isSubItem: true },
            { label: "Deal Aging", icon: Clock, href: "/crm/deals/aging", isSubItem: true },
            { label: "Win/Loss Analysis", icon: TrendingUp, href: "/crm/deals/win-loss", isSubItem: true },
            { label: "Organizations", icon: Network, href: "/crm/organizations" },
            { label: "Clients", icon: UserCheck, href: "/crm/clients" },
            { label: "Territories", icon: Map, href: "/crm/territories", isSubItem: true },
            { label: "Targets", icon: Trophy, href: "/crm/targets" },
            { label: "Analytics", icon: BarChart3, href: "/crm/analytics" },
            { label: "CRM Reports", icon: BarChart2, href: "/crm/reports" },
            { label: "Quotes", icon: FileText, href: "/crm/quotes" },
            { label: "Web Forms", icon: FormInput, href: "/crm/web-forms", isSubItem: true },
          ],
        },
        {
          label: "CRM Settings",
          defaultCollapsed: true,
          routes: [
            { label: "Assignment Rules", icon: SlidersHorizontal, href: "/crm/settings/assignment-rules" },
            { label: "Email Templates", icon: MailOpen, href: "/crm/settings/email-templates" },
            { label: "Scoring Rules", icon: Star, href: "/crm/settings/scoring-rules" },
            { label: "SLA Rules", icon: Clock, href: "/crm/settings/sla" },
          ],
        },
        {
          label: "Finance",
          routes: [
            { label: "Billing", icon: CreditCard, href: "/billing" },
            { label: "Invoices", icon: FileText, href: "/billing/invoices", isSubItem: true },
            { label: "Sales", icon: BarChart3, href: "/sales" },
            { label: "Activity Dashboard", icon: Activity, href: "/sales/activity", isSubItem: true },
            { label: "Quotas", icon: Target, href: "/sales/quotas", isSubItem: true },
            { label: "Commissions", icon: DollarSign, href: "/sales/commissions", isSubItem: true },
            { label: "Customer Exec", icon: Handshake, href: "/customer-executive" },
            { label: "Renewal Pipeline", icon: RefreshCcw, href: "/customer-executive/renewals", isSubItem: true },
            { label: "Upsell Tracker", icon: TrendingUp, href: "/customer-executive/upsell", isSubItem: true },
            { label: "Client Onboarding", icon: ClipboardList, href: "/customer-executive/client-onboarding", isSubItem: true },
            { label: "CSAT Surveys", icon: Star, href: "/customer-executive/surveys", isSubItem: true },
            { label: "Sentiment Analysis", icon: Brain, href: "/customer-executive/sentiment", isSubItem: true },
            { label: "SLA Compliance", icon: ShieldAlert, href: "/customer-executive/sla", isSubItem: true },
            { label: "Account Summary", icon: FileText, href: "/customer-executive/account-summary", isSubItem: true },
            { label: "Forecast Report", icon: TrendingUp, href: "/sales/forecast-report", isSubItem: true },
            { label: "Sales Playbook", icon: BookOpen, href: "/sales/playbook", isSubItem: true },
            { label: "AI Sales Tools", icon: Sparkles, href: "/sales/ai-tools", isSubItem: true },
            { label: "Report Narrator", icon: FileSearch, href: "/sales/report-narrator", isSubItem: true },
            { label: "Meeting Prep", icon: CalendarCheck, href: "/sales/meeting-prep", isSubItem: true },
            { label: "Cohort Analysis", icon: BarChart3, href: "/sales/cohort-analysis", isSubItem: true },
            { label: "Rep Comparison", icon: Users, href: "/sales/rep-comparison", isSubItem: true },
          ],
        },
        {
          label: "Marketing",
          defaultCollapsed: true,
          routes: [
            { label: "Marketing Hub", icon: Megaphone, href: "/marketing" },
            { label: "Campaigns", icon: Megaphone, href: "/marketing/campaigns", isSubItem: true },
            { label: "Email Campaigns", icon: Mail, href: "/marketing/email-campaigns", isSubItem: true },
            { label: "A/B Testing", icon: FlaskConical, href: "/marketing/ab-testing", isSubItem: true },
            { label: "Marketing Calendar", icon: CalendarDays, href: "/marketing/calendar", isSubItem: true },
            { label: "Content Calendar", icon: CalendarRange, href: "/marketing/content-calendar", isSubItem: true },
            { label: "Landing Pages", icon: BarChart2, href: "/marketing/landing-pages", isSubItem: true },
            { label: "Content Brief", icon: FileText, href: "/marketing/content-brief", isSubItem: true },
            { label: "Social Analytics", icon: BarChart2, href: "/marketing/social-analytics", isSubItem: true },
            { label: "AI Insights", icon: Sparkles, href: "/marketing/ai-insights", isSubItem: true },
            { label: "Digital Marketing", icon: BarChart3, href: "/digital-marketing" },
            { label: "Digital Campaigns", icon: Megaphone, href: "/digital-marketing/campaigns", isSubItem: true },
            { label: "Digital Leads", icon: Contact2, href: "/digital-marketing/leads", isSubItem: true },
            { label: "Social", icon: Globe, href: "/digital-marketing/social", isSubItem: true },
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
            { label: "Chat", icon: MessageSquareText, href: "/chat" },
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
          label: "CRM",
          routes: [
            { label: "CRM Hub", icon: Contact2, href: "/crm" },
            { label: "Lead Pipeline", icon: Contact2, href: "/crm/leads" },
            { label: "Smart Search", icon: Search, href: "/crm/leads/smart-search", isSubItem: true },
            { label: "Distribute Leads", icon: Share2, href: "/crm/leads/distribute", isSubItem: true },
            { label: "Duplicate Detection", icon: Copy, href: "/crm/leads/duplicates", isSubItem: true },
            { label: "Deals", icon: Handshake, href: "/crm/deals" },
            { label: "Organizations", icon: Network, href: "/crm/organizations" },
            { label: "Analytics", icon: BarChart3, href: "/crm/analytics" },
            { label: "Targets", icon: Trophy, href: "/crm/targets" },
            { label: "Clients", icon: UserCheck, href: "/crm/clients" },
            { label: "Quotes", icon: FileText, href: "/crm/quotes" },
            { label: "Territories", icon: Map, href: "/crm/territories", isSubItem: true },
          ],
        },
        {
          label: "Finance",
          routes: [
            { label: "Billing", icon: CreditCard, href: "/billing" },
            { label: "Invoices", icon: FileText, href: "/billing/invoices", isSubItem: true },
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
            { label: "Custom Fields", icon: Sliders, href: "/settings/custom-fields", isSubItem: true },
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
            { label: "Sales Hub", icon: BarChart3, href: "/sales" },
            { label: "Activity Dashboard", icon: Activity, href: "/sales/activity", isSubItem: true },
            { label: "Forecast Report", icon: TrendingUp, href: "/sales/forecast-report", isSubItem: true },
            { label: "Chat", icon: MessageSquareText, href: "/chat" },
            { label: "Notifications", icon: Bell, href: "/notifications" },
          ],
        },
        {

          label: "My Pipeline",
          routes: [
            { label: "My Leads", icon: Contact2, href: "/crm/leads" },
            { label: "Smart Search", icon: Search, href: "/crm/leads/smart-search", isSubItem: true },
            { label: "Distribute Leads", icon: Share2, href: "/crm/leads/distribute", isSubItem: true },
            { label: "My Deals", icon: Handshake, href: "/crm/deals" },
            { label: "Deal Aging", icon: Clock, href: "/crm/deals/aging", isSubItem: true },
            { label: "Sales Playbook", icon: BookOpen, href: "/sales/playbook", isSubItem: true },
            { label: "AI Sales Tools", icon: Sparkles, href: "/sales/ai-tools", isSubItem: true },
            { label: "Report Narrator", icon: FileSearch, href: "/sales/report-narrator", isSubItem: true },
            { label: "Meeting Prep", icon: CalendarCheck, href: "/sales/meeting-prep", isSubItem: true },
            { label: "My Clients", icon: UserCheck, href: "/crm/clients" },
          ],
        },
        {

          label: "My Revenue",
          routes: [
            { label: "My Targets", icon: Trophy, href: "/crm/targets" },
            { label: "My Commissions", icon: DollarSign, href: "/sales/commissions" },
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
            { label: "Support Hub", icon: BarChart3, href: "/customer-executive" },
            { label: "Chat", icon: MessageSquareText, href: "/chat" },
            { label: "Notifications", icon: Bell, href: "/notifications" },
          ],
        },
        {

          label: "Helpdesk",
          routes: [
            { label: "All Tickets", icon: LifeBuoy, href: "/support" },
            { label: "Support Inbox", icon: Inbox, href: "/support/inbox", isSubItem: true },
            { label: "Ticket Analytics", icon: BarChart2, href: "/crm/analytics" },
          ],
        },
        {

          label: "Customers",
          routes: [
            { label: "Clients", icon: Users, href: "/crm/clients" },
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
            { label: "Chat", icon: MessageSquareText, href: "/chat" },
            { label: "Notifications", icon: Bell, href: "/notifications" },
          ],
        },
        {

          label: "Marketing",
          routes: [
            { label: "Marketing Hub", icon: Megaphone, href: "/marketing" },
            { label: "Campaigns", icon: Megaphone, href: "/marketing/campaigns", isSubItem: true },
            { label: "Email Campaigns", icon: Mail, href: "/marketing/email-campaigns", isSubItem: true },
            { label: "A/B Testing", icon: FlaskConical, href: "/marketing/ab-testing", isSubItem: true },
            { label: "Marketing Calendar", icon: CalendarDays, href: "/marketing/calendar", isSubItem: true },
            { label: "Content Calendar", icon: CalendarRange, href: "/marketing/content-calendar", isSubItem: true },
            { label: "Landing Pages", icon: BarChart2, href: "/marketing/landing-pages", isSubItem: true },
            { label: "Content Brief", icon: FileText, href: "/marketing/content-brief", isSubItem: true },
            { label: "Social Analytics", icon: BarChart2, href: "/marketing/social-analytics", isSubItem: true },
            { label: "AI Insights", icon: Sparkles, href: "/marketing/ai-insights", isSubItem: true },
            { label: "Digital Marketing", icon: BarChart3, href: "/digital-marketing" },
            { label: "Digital Campaigns", icon: Megaphone, href: "/digital-marketing/campaigns", isSubItem: true },
            { label: "Digital Leads", icon: Contact2, href: "/digital-marketing/leads", isSubItem: true },
            { label: "Social", icon: Globe, href: "/digital-marketing/social", isSubItem: true },
          ],
        },
        {

          label: "CRM (Leads)",
          routes: [
            { label: "CRM Hub", icon: Contact2, href: "/crm" },
            { label: "Lead Pipeline", icon: TrendingUp, href: "/crm/leads" },
            { label: "Lead Analytics", icon: BarChart2, href: "/crm/analytics" },
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
            { label: "Chat", icon: MessageSquareText, href: "/chat" },
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
            { label: "Chat", icon: MessageSquareText, href: "/chat" },
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
