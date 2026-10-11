export const ROUTE_ROLE_MAP: Record<string, string[]> = {
  "/hr": ["CEO", "HR", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/onboarding": ["CEO", "HR", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/payroll": ["CEO", "HR", "BRANCH_HR"],
  "/hr/documents": ["CEO", "HR", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/work-logs": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/career-ladders": ["CEO", "HR", "ADMIN", "BRANCH_MANAGER", "BRANCH_HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],
  "/hr/holidays": ["CEO", "HR", "ADMIN", "BRANCH_MANAGER", "BRANCH_HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],
  "/hr/performance": ["CEO", "HR", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/org-chart": ["CEO", "HR"],
  "/hr/incentives": ["CEO", "HR"],
  "/hr/my-payslips": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/my-assets": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/my-bonuses": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/leaves": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/expenses": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/attendance": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/exit": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/helpdesk": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/crm/leads": ["CEO", "HR", "SALES", "BRANCH_MANAGER", "DIGITAL_MARKETING"],
  "/crm/deals": ["CEO", "HR", "SALES", "BRANCH_MANAGER"],
  "/crm/targets": ["CEO", "HR", "SALES", "BRANCH_MANAGER"],
  "/crm/reports": ["CEO", "HR"],
  "/crm/clients": ["CEO", "HR", "CUSTOMER_SUPPORT", "SALES"],
  "/projects": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/timesheets": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/support": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/support/inbox": ["CEO", "HR", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "SALES"],
  "/sales": ["CEO", "HR", "SALES"],
  "/customer-executive": ["CEO", "HR", "CUSTOMER_SUPPORT"],
  "/settings": ["CEO", "HR"],
  "/settings/roles": ["CEO", "HR"],
  "/settings/branches": ["CEO", "HR"],
  "/billing": ["CEO", "HR"],
  "/billing/invoices": ["CEO", "HR"],
  "/notifications": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/ceo": ["CEO", "HR"],

  "/ai": ["CEO", "HR"],
  "/dashboard/admin-health": ["CEO", "HR"],
  "/dashboard/branches": ["CEO", "HR"],

  "/calendar": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
};

export function canAccessRoute(pathname: string, role: string): boolean {
  if (role === "CEO" || role === "ADMIN") return true;

  const matchingRoutes = Object.keys(ROUTE_ROLE_MAP)
    .filter((route) => pathname === route || pathname.startsWith(route + "/"))
    .sort((a, b) => b.length - a.length);

  if (matchingRoutes.length === 0) return true;

  return ROUTE_ROLE_MAP[matchingRoutes[0]].includes(role);
}
