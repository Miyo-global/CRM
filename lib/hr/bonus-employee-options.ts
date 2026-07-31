import { format } from "date-fns";
import type { Employee } from "@/types/hr";

export interface BonusEmployeeOption {
  value: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  /** Compact secondary text for dropdown rows (department or role). */
  secondaryLabel: string;
  department: string | null;
  designation: string | null;
  joiningDate: string | null;
  joiningLabel: string | null;
  employeeId: string | null;
  keywords: string;
}

function employeeDisplayName(employee: Employee): string {
  const fromParts = `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim();
  return employee.name ?? (fromParts || employee.email);
}

export function formatEmployeeRoleLabel(role: string): string {
  return role
    .split("_")
    .map((part) => {
      if (part.length <= 3 && part === part.toUpperCase()) return part;
      return part.charAt(0) + part.slice(1).toLowerCase();
    })
    .join(" ");
}

function formatJoiningLabel(joiningDate: string | null | undefined): string | null {
  if (!joiningDate) return null;
  const parsed = new Date(joiningDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return format(parsed, "dd MMM yyyy");
}

/** Sort employees for bonus allocation (role → department → joining date). */
export interface BonusEmployeeRoleGroup {
  role: string;
  roleLabel: string;
  options: BonusEmployeeOption[];
}

export function groupBonusEmployeeOptionsByRole(
  options: BonusEmployeeOption[],
): BonusEmployeeRoleGroup[] {
  const groups = new Map<string, BonusEmployeeRoleGroup>();
  for (const option of options) {
    const existing = groups.get(option.role);
    if (existing) {
      existing.options.push(option);
      continue;
    }
    groups.set(option.role, {
      role: option.role,
      roleLabel: option.roleLabel,
      options: [option],
    });
  }
  return Array.from(groups.values());
}

export function buildBonusEmployeeOptions(employees: Employee[]): BonusEmployeeOption[] {
  return [...employees]
    .filter((employee) => employee.isActive)
    .sort((a, b) => {
      const roleOrder = a.role.localeCompare(b.role);
      if (roleOrder !== 0) return roleOrder;

      const deptA = a.department?.name ?? "";
      const deptB = b.department?.name ?? "";
      const deptOrder = deptA.localeCompare(deptB);
      if (deptOrder !== 0) return deptOrder;

      const joinA = a.joiningDate ?? "";
      const joinB = b.joiningDate ?? "";
      const joinOrder = joinA.localeCompare(joinB);
      if (joinOrder !== 0) return joinOrder;

      return employeeDisplayName(a).localeCompare(employeeDisplayName(b));
    })
    .map((employee) => {
      const name = employeeDisplayName(employee);
      const roleLabel = formatEmployeeRoleLabel(employee.role);
      const joiningLabel = formatJoiningLabel(employee.joiningDate);

      const department = employee.department?.name ?? null;

      return {
        value: employee.id,
        name,
        email: employee.email,
        role: employee.role,
        roleLabel,
        secondaryLabel: department ?? roleLabel,
        department,
        designation: employee.designation,
        joiningDate: employee.joiningDate,
        joiningLabel,
        employeeId: employee.employeeId,
        keywords: `${name} ${employee.email} ${employee.role} ${roleLabel} ${employee.department?.name ?? ""} ${employee.designation ?? ""} ${employee.employeeId ?? ""} ${joiningLabel ?? ""}`,
      };
    });
}
