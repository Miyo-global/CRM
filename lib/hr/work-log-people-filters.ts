export interface WorkLogPeopleFilters {
  selectedUserId?: string;
  departmentId?: string;
  viewAllTeam?: boolean;
}

export interface WorkLogPeopleEmployee {
  id: string;
  departmentId?: number | null;
}

export function employeeInDepartment(
  employee: WorkLogPeopleEmployee | undefined,
  departmentId: string | undefined,
): boolean {
  if (!departmentId || !employee) return true;
  return employee.departmentId?.toString() === departmentId;
}

/**
 * Keeps department + employee filters consistent: both can be active together when
 * the employee belongs to the selected department.
 */
export function normalizeWorkLogPeopleFilters<T extends WorkLogPeopleFilters>(
  filters: T,
  employees: WorkLogPeopleEmployee[],
): T {
  if (employees.length === 0 && filters.departmentId && filters.selectedUserId) {
    return filters;
  }

  const { departmentId, selectedUserId } = filters;

  if (!selectedUserId) {
    return {
      ...filters,
      viewAllTeam: !!departmentId || !!filters.viewAllTeam,
    };
  }

  const employee = employees.find((e) => e.id === selectedUserId);
  if (departmentId && !employeeInDepartment(employee, departmentId)) {
    return {
      ...filters,
      selectedUserId: undefined,
      viewAllTeam: true,
    };
  }

  return {
    ...filters,
    viewAllTeam: false,
  };
}
