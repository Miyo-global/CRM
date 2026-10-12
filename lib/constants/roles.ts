
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

export function hasRole(role: string | undefined | null, allowed: readonly string[]): boolean {
  return !!role && allowed.includes(role);
}
