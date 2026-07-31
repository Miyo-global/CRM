export interface Employee {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
  image: string | null;
  designation: string | null;
  employeeId: string | null;
  joiningDate: string | null;
  isActive: boolean;
  hasDashboardAccess: boolean;
  department: { id: number; name: string } | null;
}

export type UserRole = string;
export type StatusFilter = "All" | "Active" | "Inactive";
export type RoleFilter =
  | "All"
  | "CEO"
  | "HR"
  | "SALES"
  | "CUSTOMER_SUPPORT"
  | "ENGINEERING"
  | "DESIGN"
  | "VIDEO_EDITOR"
  | "DIGITAL_MARKETING";

export const ROLE_LABELS: Record<string, string> = {
  CEO: "CEO",
  HR: "HR",
  SALES: "Sales",
  CUSTOMER_SUPPORT: "Customer Support",
  ENGINEERING: "Engineering",
  DESIGN: "Design",
  VIDEO_EDITOR: "Video Editor",
  DIGITAL_MARKETING: "Digital Marketing",
  BRANCH_MANAGER: "Branch Manager",
  BRANCH_HR: "Branch HR",
  ADMIN: "Admin",
};

import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
} from "@/lib/pagination-constants";

export { PAGE_SIZE_OPTIONS, type PageSizeOption };

export const PAGE_SIZE = DEFAULT_PAGE_SIZE;

export function canDeleteEmployee(
  targetRole: UserRole,
  targetId: string,
  currentRole: string | undefined,
  currentId: string | undefined,
): boolean {
  if (targetId === currentId) return false;
  if (currentRole === "CEO") return targetRole !== "CEO";
  if (currentRole === "HR") return targetRole !== "CEO" && targetRole !== "HR";
  return false;
}

type EmployeeNameFields = Pick<Employee, "firstName" | "lastName" | "email">;

export function getDisplayName(employee: EmployeeNameFields): string {
  if (employee.firstName)
    return `${employee.firstName} ${employee.lastName ?? ""}`.trim();
  return employee.email;
}

export function getInitials(employee: EmployeeNameFields): string {
  if (employee.firstName && employee.lastName) {
    return `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase();
  }
  return employee.email.charAt(0).toUpperCase();
}
