import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { hasFullAccess } from "@/lib/constants/roles";
import { ROLE_DEFAULT_PERMISSIONS } from "@/lib/rbac/permissions";
import { SYSTEM_ROLES } from "@/lib/rbac/roles";
import { SUPPORT_STAFF_ROLES } from "@/lib/constants/support-sla";

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
  // Organization profile and the data export hub are org-wide controls, not
  // people-team tools.
  "organization",
  "data-hub",
] as const;

/** Every admin-only page under /settings, checked against the app router in the tests. */
export const ADMIN_SETTINGS_PAGES = [
  ...HR_SETTINGS_PAGES,
  ...ORG_ADMIN_SETTINGS_PAGES,
] as const;

/**
 * KB-0008: the middleware cannot read a per-user permission override, so a
 * permission-gated page is mapped to the roles whose defaults hold it. The API
 * route behind the page still checks the permission itself.
 */
function rolesWithPermission(...permissions: string[]): string[] {
  return SYSTEM_ROLES.filter((role) => {
    const granted = ROLE_DEFAULT_PERMISSIONS[role] ?? [];
    return permissions.some((permission) => granted.includes(permission));
  });
}

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
  // Read-only for employees: the API returns only PUBLISHED versions to a
  // non-manager and every write is withAdmin (QA P2-emp-handbook).
  "/hr/handbook": EVERYONE,
  // The kudos wall: every member already gets the shoutout notification that
  // links here, and the API lets any member read and give kudos. Email export
  // stays admin-only inside its route (QA P2-employee-recognition).
  "/hr/recognition": EVERYONE,
  "/hr/performance": HR_TEAM,
  "/hr/org-chart": HR_TEAM,
  "/hr/my-payslips": EVERYONE,
  "/hr/my-documents": EVERYONE,
  "/hr/my-assets": EVERYONE,
  // Own completed reviews and goals; the APIs scope a non-admin to self.
  "/hr/my-reviews": EVERYONE,
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
  // The Customer Support module is for the staff handling external support;
  // employees raise their own issues on /hr/helpdesk (owner decision, FR1-032).
  "/support": [...SUPPORT_STAFF_ROLES],
  "/support/inbox": [...SUPPORT_STAFF_ROLES],
  // /settings itself is the personal account page (profile, security).
  // Every admin settings page is listed explicitly; ADMIN_SETTINGS_PAGES
  // below is checked against app/(dashboard)/settings/* in the tests.
  "/settings": EVERYONE,
  "/settings/notifications": EVERYONE,
  ...Object.fromEntries(HR_SETTINGS_PAGES.map((p) => [`/settings/${p}`, HR_TEAM])),
  // CEO and ADMIN pass every route via hasFullAccess, so an empty list here
  // means "org admins only".
  ...Object.fromEntries(ORG_ADMIN_SETTINGS_PAGES.map((p) => [`/settings/${p}`, [] as string[]])),
  "/notifications": EVERYONE,
  // QA-AUTH-07: QR codes are an HR and admin tool, not a CEO page.
  "/tools": HR_TEAM,

  "/ai": HR_TEAM,
  // System health is a Super Admin / Admin page.
  "/dashboard/admin-health": [],

  // Pages that had no entry and so opened for every role (QA-0065).
  "/reports": HR_TEAM,
  "/portal": HR_TEAM,
  "/tasks": EVERYONE,
  "/tasks/overdue": HR_TEAM,

  "/calendar": EVERYONE,

  // KB-0008: the wiki itself is open to every signed-in employee; what they can
  // read is narrowed by space and page access inside. Longest prefix wins, so
  // the three gated pages below still need their permission.
  "/knowledge": EVERYONE,
  "/knowledge/wiki/manage": rolesWithPermission("kb:analytics:view"),
  "/knowledge/wiki/analytics": rolesWithPermission("kb:analytics:view"),
  "/knowledge/wiki/import": rolesWithPermission("kb:pages:import", "kb:pages:export"),
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

/**
 * QA-AUTH-09: everyone may open their own employee record (it has a
 * my-profile tab and the loader already allows it), though /hr is otherwise
 * the people team's. Only the record page itself, not its edit routes.
 */
export function isOwnEmployeeRecord(pathname: string, userId: string | null | undefined): boolean {
  if (!userId) return false;
  const path = pathname.replace(/\/+$/, "");
  return path === `/hr/employees/${userId}`;
}

/** Path prefixes of the ATS module, staff pages and their APIs. */
const ATS_PREFIXES = ["/ats", "/api/ats", "/api/public/ats"];

/**
 * The ATS ships off (NEXT_PUBLIC_ATS_MODULE). The middleware turns every ATS
 * page and API away centrally while it is off, so a route that forgot its own
 * flag check is still unreachable. The module code itself stays.
 */
export function isDisabledModuleRoute(pathname: string, atsEnabled = ATS_MODULE_ENABLED): boolean {
  if (atsEnabled) return false;
  return ATS_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
