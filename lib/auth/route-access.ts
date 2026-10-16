import { hasFullAccess } from "@/lib/constants/roles";
import { SYSTEM_ROLES } from "@/lib/rbac/roles";

/** Routes any signed-in employee may open. */
const EVERYONE: string[] = [...SYSTEM_ROLES];
/** Routes limited to the people team. CEO and ADMIN pass every route anyway. */
const HR_TEAM: string[] = ["CEO", "HR"];

/** Org-admin pages under /settings (MIYO-0024). */
export const ADMIN_SETTINGS_PAGES = [
  "members",
  "roles",
  "permissions",
  "organization",
  "custom-fields",
  "data-hub",
  "email-templates",
  "job-roles",
  "payroll-schedule",
  "termination-reasons",
  "webhooks",
  "audit-log",
  "ai",
  "branches",
] as const;

export const ROUTE_ROLE_MAP: Record<string, string[]> = {
  "/hr": HR_TEAM,
  "/hr/onboarding": HR_TEAM,
  // New hires open their own checklist (linked from the onboarding-welcome email).
  "/hr/onboarding/my-tasks": EVERYONE,
  "/hr/payroll": HR_TEAM,
  "/hr/documents": HR_TEAM,
  "/hr/work-logs": EVERYONE,
  "/hr/career-ladders": EVERYONE,
  "/hr/holidays": EVERYONE,
  "/hr/performance": HR_TEAM,
  "/hr/org-chart": HR_TEAM,
  "/hr/incentives": HR_TEAM,
  "/hr/my-payslips": EVERYONE,
  "/hr/my-documents": EVERYONE,
  "/hr/my-assets": EVERYONE,
  "/hr/my-bonuses": EVERYONE,
  "/hr/leaves": EVERYONE,
  "/hr/expenses": EVERYONE,
  "/hr/attendance": EVERYONE,
  "/hr/exit": EVERYONE,
  "/hr/helpdesk": EVERYONE,
  "/profile": EVERYONE,
  "/projects": EVERYONE,
  "/timesheets": EVERYONE,
  "/support": EVERYONE,
  "/support/inbox": EVERYONE,
  // /settings itself is the personal account page (profile, security, MFA).
  // Every admin settings page is listed explicitly; ADMIN_SETTINGS_PAGES
  // below is checked against app/(dashboard)/settings/* in the tests.
  "/settings": EVERYONE,
  "/settings/notifications": EVERYONE,
  ...Object.fromEntries(ADMIN_SETTINGS_PAGES.map((p) => [`/settings/${p}`, HR_TEAM])),
  "/notifications": EVERYONE,
  "/ceo": HR_TEAM,

  "/ai": HR_TEAM,
  "/dashboard/admin-health": HR_TEAM,
  "/dashboard/branches": HR_TEAM,

  "/calendar": EVERYONE,
};

export function canAccessRoute(pathname: string, role: string): boolean {
  if (hasFullAccess(role)) return true;

  const matchingRoutes = Object.keys(ROUTE_ROLE_MAP)
    .filter((route) => pathname === route || pathname.startsWith(route + "/"))
    .sort((a, b) => b.length - a.length);

  if (matchingRoutes.length === 0) return true;

  return ROUTE_ROLE_MAP[matchingRoutes[0]].includes(role);
}
