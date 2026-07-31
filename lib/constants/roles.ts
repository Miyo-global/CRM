
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
  BRANCH_MANAGER: "BRANCH_MANAGER",
  BRANCH_HR: "BRANCH_HR",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ADMIN_ROLES: readonly string[] = [ROLES.CEO, ROLES.HR, ROLES.ADMIN];

export const EXPENSE_ADMIN_ROLES: readonly string[] = [ROLES.CEO, ROLES.HR, ROLES.ADMIN];

export const RECRUITMENT_HR_ROLES: readonly string[] = [
  ROLES.CEO,
  ROLES.HR,
  ROLES.ADMIN,
  ROLES.BRANCH_HR,
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

export const HR_ROLES: readonly string[] = [ROLES.HR, ROLES.BRANCH_HR];

export const EXPORT_ROLES: readonly string[] = [ROLES.CEO, ROLES.HR, ROLES.ADMIN, ROLES.SALES];

export const CHURN_ALERT_ROLES: readonly string[] = [ROLES.CEO, ROLES.HR, ROLES.ADMIN, ROLES.CUSTOMER_SUPPORT];

export const CSAT_MANAGE_ROLES: readonly string[] = [ROLES.CEO, ROLES.HR, ROLES.ADMIN, ROLES.CUSTOMER_SUPPORT];

export const ONBOARDING_MUTATE_ROLES: readonly string[] = [ROLES.CEO, ROLES.HR, ROLES.ADMIN, ROLES.BRANCH_HR];

export const MANAGEMENT_ROLES: readonly string[] = [ROLES.CEO, ROLES.ADMIN, ROLES.HR, ROLES.BRANCH_MANAGER];

export function hasRole(role: string | undefined | null, allowed: readonly string[]): boolean {
  return !!role && allowed.includes(role);
}
