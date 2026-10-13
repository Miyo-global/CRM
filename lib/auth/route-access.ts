export const ROUTE_ROLE_MAP: Record<string, string[]> = {
  "/hr": ["CEO", "HR"],
  "/hr/onboarding": ["CEO", "HR"],
  "/hr/payroll": ["CEO", "HR"],
  "/hr/documents": ["CEO", "HR"],
  "/hr/work-logs": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],
  "/hr/career-ladders": ["CEO", "HR", "ADMIN", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],
  "/hr/holidays": ["CEO", "HR", "ADMIN", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],
  "/hr/performance": ["CEO", "HR"],
  "/hr/org-chart": ["CEO", "HR"],
  "/hr/incentives": ["CEO", "HR"],
  "/hr/my-payslips": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],
  "/hr/my-assets": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],
  "/hr/my-bonuses": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],
  "/hr/leaves": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],
  "/hr/expenses": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],
  "/hr/attendance": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],
  "/hr/exit": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],
  "/hr/helpdesk": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],
  "/projects": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],
  "/timesheets": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],
  "/support": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],
  "/support/inbox": ["CEO", "HR", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "SALES"],
  "/settings": ["CEO", "HR"],
  "/settings/roles": ["CEO", "HR"],
  "/settings/branches": ["CEO", "HR"],
  "/notifications": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],
  "/ceo": ["CEO", "HR"],

  "/ai": ["CEO", "HR"],
  "/dashboard/admin-health": ["CEO", "HR"],
  "/dashboard/branches": ["CEO", "HR"],

  "/calendar": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],
};

export function canAccessRoute(pathname: string, role: string): boolean {
  if (role === "CEO" || role === "ADMIN") return true;

  const matchingRoutes = Object.keys(ROUTE_ROLE_MAP)
    .filter((route) => pathname === route || pathname.startsWith(route + "/"))
    .sort((a, b) => b.length - a.length);

  if (matchingRoutes.length === 0) return true;

  return ROUTE_ROLE_MAP[matchingRoutes[0]].includes(role);
}
