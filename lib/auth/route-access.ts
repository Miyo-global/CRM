import { hasFullAccess } from "@/lib/constants/roles";
import { SYSTEM_ROLES } from "@/lib/rbac/roles";

/** Routes any signed-in employee may open. */
const EVERYONE: string[] = [...SYSTEM_ROLES];
/** Routes limited to the people team. CEO and ADMIN pass every route anyway. */
const HR_TEAM: string[] = ["CEO", "HR"];
/** MIYO-0628: the ATS. Per-job scoping is applied inside, in lib/ats/access.ts. */

/**
 * Pages under /settings the people team manages (shown in the HR menu).
 */
export const HR_SETTINGS_PAGES = [
  "members",
  "organization",
  "custom-fields",
  "data-hub",
  "email-templates",
  "job-roles",
  "payroll-schedule",
  "termination-reasons",
] as const;

/**
 * Pages under /settings only the CEO and Admin may open.
 *
 * HR could reach Roles & Permissions, the Permission Matrix, the Audit Log and
 * Webhooks by typing the URL although its own menu hides them (QA-0034).
 */
export const ORG_ADMIN_SETTINGS_PAGES = [
  "roles",
  "permissions",
  "webhooks",
  "audit-log",
  "ai",
] as const;

/** Every admin-only page under /settings, checked against the app router in the tests. */
export const ADMIN_SETTINGS_PAGES = [
  ...HR_SETTINGS_PAGES,
  ...ORG_ADMIN_SETTINGS_PAGES,
] as const;

export const ROUTE_ROLE_MAP: Record<string, string[]> = {
  // MIYO-0645: /ats is not gated by role here. A hiring manager or an
  // interviewer is an ordinary employee who holds a seat on one job, and
  // the middleware cannot read ats_job_members. Each ATS page and route
  // checks the seat itself through lib/ats/access.ts.
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
  // Own claims and own loans: both APIs scope a non-admin to their own rows
  // (MIYO-0152).
  "/hr/reimbursements": EVERYONE,
  "/hr/loans": EVERYONE,
  "/hr/my-bonuses": EVERYONE,
  "/hr/leaves": EVERYONE,
  // Longest prefix wins, so the policy editor stays with the people team even
  // though /hr/leaves is open to everyone (QA-0065).
  "/hr/leaves/policies": HR_TEAM,
  "/hr/expenses": EVERYONE,
  "/hr/attendance": EVERYONE,
  "/hr/exit": EVERYONE,
  "/hr/helpdesk": EVERYONE,
  "/profile": EVERYONE,
  "/projects": EVERYONE,
  // Bare ticket links resolve to the project-scoped page (QA-0026).
  "/tickets": EVERYONE,
  "/timesheets": EVERYONE,
  "/timesheets/team": HR_TEAM,
  "/support": EVERYONE,
  "/support/inbox": EVERYONE,
  // /settings itself is the personal account page (profile, security, MFA).
  // Every admin settings page is listed explicitly; ADMIN_SETTINGS_PAGES
  // below is checked against app/(dashboard)/settings/* in the tests.
  "/settings": EVERYONE,
  "/settings/notifications": EVERYONE,
  ...Object.fromEntries(HR_SETTINGS_PAGES.map((p) => [`/settings/${p}`, HR_TEAM])),
  // CEO and ADMIN pass every route via hasFullAccess, so an empty list here
  // means "org admins only".
  ...Object.fromEntries(ORG_ADMIN_SETTINGS_PAGES.map((p) => [`/settings/${p}`, [] as string[]])),
  "/notifications": EVERYONE,
  "/ceo": HR_TEAM,

  "/ai": HR_TEAM,
  "/dashboard/admin-health": HR_TEAM,

  // Pages that had no entry and so opened for every role (QA-0065).
  "/reports": HR_TEAM,
  "/portal": HR_TEAM,
  "/tasks": EVERYONE,
  "/tasks/overdue": HR_TEAM,

  "/calendar": EVERYONE,
  // The denied view itself is open to everyone (QA-0034).
  "/access-restricted": EVERYONE,
};

export function canAccessRoute(pathname: string, role: string): boolean {
  if (hasFullAccess(role)) return true;

  const matchingRoutes = Object.keys(ROUTE_ROLE_MAP)
    .filter((route) => pathname === route || pathname.startsWith(route + "/"))
    .sort((a, b) => b.length - a.length);

  if (matchingRoutes.length === 0) return true;

  return ROUTE_ROLE_MAP[matchingRoutes[0]].includes(role);
}
