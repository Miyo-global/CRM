
export const ROLES = {
  CEO: "CEO",
  HR: "HR",
  ADMIN: "ADMIN",
  SALES: "SALES",
  ENGINEERING: "ENGINEERING",
  DESIGN: "DESIGN",
  CUSTOMER_SUPPORT: "CUSTOMER_SUPPORT",
  VIDEO_EDITOR: "VIDEO_EDITOR",
  DIGITAL_MARKETING: "DIGITAL_MARKETING",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ADMIN_ROLES: readonly string[] = [ROLES.CEO, ROLES.HR, ROLES.ADMIN];

export const EXPENSE_ADMIN_ROLES: readonly string[] = [ROLES.CEO, ROLES.HR, ROLES.ADMIN];

/** Roles that act on hiring-adjacent HR records (asset handover, documents). */
export const RECRUITMENT_HR_ROLES: readonly string[] = [
  ROLES.CEO,
  ROLES.HR,
  ROLES.ADMIN,
];

export function isRecruitmentHr(role: string | undefined | null): boolean {
  return !!role && RECRUITMENT_HR_ROLES.includes(role);
}

export const ALL_ROLES: readonly string[] = Object.values(ROLES);

export function isAdminOrOwner(role: string | undefined | null): boolean {
  return !!role && ADMIN_ROLES.includes(role);
}

export function isCEO(role: string | undefined | null): boolean {
  return role === ROLES.CEO;
}

export function isExpenseAdmin(role: string | undefined | null): boolean {
  return !!role && EXPENSE_ADMIN_ROLES.includes(role);
}

/**
 * All employee roles — replaces the 12-copy inline array in middleware.ts
 * and local role constants in 15 API route files.
 */
export const ALL_EMPLOYEE_ROLES: readonly string[] = Object.values(ROLES);

export const HR_ROLES: readonly string[] = [ROLES.HR];

export const INVOICE_ROLES: readonly string[] = [ROLES.CEO, ROLES.ADMIN, ROLES.HR, ROLES.SALES];

export const BILLING_VIEW_ROLES: readonly string[] = [ROLES.CEO, ROLES.ADMIN, ROLES.HR];

export const BILLING_MANAGE_ROLES: readonly string[] = [ROLES.CEO, ROLES.ADMIN];

export const EXPORT_ROLES: readonly string[] = [ROLES.CEO, ROLES.HR, ROLES.ADMIN, ROLES.SALES];

export const CHURN_ALERT_ROLES: readonly string[] = [ROLES.CEO, ROLES.HR, ROLES.ADMIN, ROLES.CUSTOMER_SUPPORT];

export const CSAT_MANAGE_ROLES: readonly string[] = [ROLES.CEO, ROLES.HR, ROLES.ADMIN, ROLES.CUSTOMER_SUPPORT];

export const ONBOARDING_MUTATE_ROLES: readonly string[] = [ROLES.CEO, ROLES.HR, ROLES.ADMIN];

/**
 * Roles that manage new-employee onboarding (Add Employee wizard, onboarding
 * progress, onboarding documents for other employees). Matches `withAdmin`.
 */
export const ONBOARDING_MANAGER_ROLES: readonly string[] = ADMIN_ROLES;

export function isOnboardingManager(role: string | undefined | null): boolean {
  return hasRole(role, ONBOARDING_MANAGER_ROLES);
}

export const MANAGEMENT_ROLES: readonly string[] = [ROLES.CEO, ROLES.ADMIN, ROLES.HR];

/**
 * Roles that hold every permission (see ROLE_DEFAULT_PERMISSIONS in
 * lib/rbac/permissions.ts). They pass every role gate, so the UI never shows
 * them a link they cannot open (A9).
 */
export const FULL_ACCESS_ROLES: readonly string[] = [ROLES.CEO, ROLES.ADMIN];

export function hasFullAccess(role: string | undefined | null): boolean {
  return !!role && FULL_ACCESS_ROLES.includes(role);
}

/**
 * The one page-level access check. `allowed` lists the extra roles a page is
 * open to; CEO and ADMIN always pass.
 */
export function canAccess(
  role: string | undefined | null,
  allowed: readonly string[],
): boolean {
  if (!role) return false;
  return hasFullAccess(role) || allowed.includes(role);
}

export function hasRole(role: string | undefined | null, allowed: readonly string[]): boolean {
  return !!role && allowed.includes(role);
}

/**
 * Who signs off payroll (QA-0023).
 *
 * Approval used to be CEO-only, which deadlocked an org with no CEO user and
 * left the CEO's own payroll unapprovable, while mark-as-paid accepted any
 * admin — HR could pay what it could not approve. Approving and paying now
 * take the same authority, and anyone in this list can approve a colleague's
 * payroll (never their own).
 */
export const PAYROLL_APPROVER_ROLES: readonly string[] = [ROLES.CEO, ROLES.ADMIN];

export function isPayrollApprover(role: string | undefined | null): boolean {
  return !!role && PAYROLL_APPROVER_ROLES.includes(role);
}

/** Who may add, edit or delete holidays: the same on the API and server actions (MIYO-0085). */
export function canManageHolidays(role: string | undefined | null): boolean {
  return isAdminOrOwner(role);
}

/**
 * Who gives the final sign-off on a resignation (R3-0002). CEO-only left an
 * org with no CEO user unable to finish any exit; Admin carries the same
 * authority. Nobody signs off their own exit.
 */
export const EXIT_FINAL_APPROVER_ROLES: readonly string[] = [ROLES.CEO, ROLES.ADMIN];

export function isExitFinalApprover(role: string | undefined | null): boolean {
  return !!role && EXIT_FINAL_APPROVER_ROLES.includes(role);
}

/**
 * Roles whose attendance is not enforced: they are never auto-marked absent
 * and never listed in the HR absentee digest (QA-0042).
 */
export const ATTENDANCE_EXEMPT_ROLES: readonly string[] = [ROLES.CEO, ROLES.ADMIN];
