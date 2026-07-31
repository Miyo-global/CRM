/**
 * Centralised route constants for notification links and redirects.
 * Replaces inline path strings assembled in email helpers and API routes.
 */

export const ROUTES = {
  HR: {
    LEAVES: "/hr/leaves",
    EXIT: "/hr/exit",
    EXPENSES: "/hr/expenses",
    APPRAISALS_REVIEW: "/hr/appraisals/review",
    ASSETS: "/hr/assets",
    LOANS: "/hr/loans",
    PAYROLL: "/hr/payroll",
    RECRUITMENT: "/hr/recruitment",
    EMPLOYEES: "/hr/employees",
    ATTENDANCE: "/hr/attendance",
    PERFORMANCE: "/hr/performance",
  },
  CRM: {
    CLIENT: (id: string | number) => `/crm/clients/${id}`,
    DEALS: "/crm/deals",
    LEADS: "/crm/leads",
    CONTACTS: "/crm/contacts",
    ORGANIZATIONS: "/crm/organizations",
  },
  PROJECTS: {
    PROJECT: (id: string | number) => `/projects/${id}`,
    LIST: "/projects",
  },
  SETTINGS: {
    MEMBERS: "/settings/members",
    ROLES: "/settings/roles",
    ORGANIZATION: "/settings/organization",
  },
  DASHBOARD: "/dashboard",
} as const;
