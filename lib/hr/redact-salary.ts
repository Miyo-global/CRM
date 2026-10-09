import { isAdminOrOwner } from "@/lib/constants/roles";

type WithSalary = { id: string; monthlySalary: string | null };

export function canViewSalaryOf(viewer: { id: string; role?: string | null }, targetId: string): boolean {
  return viewer.id === targetId || isAdminOrOwner(viewer.role);
}

export function redactSalary<T extends WithSalary>(row: T, viewer: { id: string; role?: string | null }): T {
  return canViewSalaryOf(viewer, row.id) ? row : { ...row, monthlySalary: null };
}
