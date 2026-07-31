"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Department,
  Employee,
  OrgChartNode,
  PaginatedEmployees,
  EmployeeStats,
  CreateDepartmentInput,
  UpdateProfileInput,
  OnboardEmployeeInput,
} from "@/types/hr";
import type { TerminatedEmployee } from "@/types/hr/employees";

export function useHrDepartments() {
  return useQuery({
    queryKey: queryKeys.hr.departments(),
    queryFn: () => apiClient.get<Department[]>("/hr/departments"),
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDepartmentInput) =>
      apiClient.post<{ success: boolean }>("/hr/departments", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.departments() }),
  });
}

export type HrEmployeesQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  q?: string;
  dept?: string;
  role?: string;
  status?: string;
};

export function useHrEmployees(
  params?: HrEmployeesQueryParams,
  options?: Omit<
    import("@tanstack/react-query").UseQueryOptions<Employee[] | PaginatedEmployees, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: queryKeys.hr.employees(params),
    queryFn: () =>
      apiClient.get<Employee[] | PaginatedEmployees>("/hr/employees", params as Record<string, unknown>),
    ...options,
  });
}

export function isPaginatedEmployees(
  data: Employee[] | PaginatedEmployees | undefined,
): data is PaginatedEmployees {
  return data != null && !Array.isArray(data) && "pagination" in data;
}

export function useTerminatedEmployees() {
  return useQuery({
    queryKey: queryKeys.hr.terminatedEmployees(),
    queryFn: () => apiClient.get<TerminatedEmployee[]>("/hr/employees/terminated"),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, ...data }: UpdateProfileInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/employees/${userId}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.all }),
  });
}

export function useTerminateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.patch<{ success: boolean }>(`/hr/employees/${userId}`, { isActive: false }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.all });
      qc.invalidateQueries({ queryKey: queryKeys.hr.terminatedEmployees() });
    },
  });
}

export function useToggleDashboardAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, hasDashboardAccess }: { userId: string; hasDashboardAccess: boolean }) =>
      apiClient.patch<{ success: boolean }>(`/hr/employees/${userId}`, { hasDashboardAccess }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.employees() }),
  });
}

/**
 * D7: flip an employee's active status (suspend / reactivate) via the
 * dedicated endpoint, distinct from the termination workflow.
 */
export function useSetEmployeeActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      apiClient.patch<{ success: boolean; isActive: boolean }>(
        `/hr/employees/${userId}/active`,
        { isActive },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.all });
      qc.invalidateQueries({ queryKey: queryKeys.hr.terminatedEmployees() });
    },
  });
}

export function useHrOrgChart() {
  return useQuery({
    queryKey: queryKeys.hr.orgChart(),
    queryFn: () => apiClient.get<OrgChartNode[]>("/hr/org-chart"),
  });
}

export function useHrEmployeeStats(userId: string) {
  return useQuery({
    queryKey: queryKeys.hr.employeeStats(userId),
    queryFn: () =>
      apiClient.get<EmployeeStats>("/hr/employees/stats", { userId }),
    enabled: !!userId,
  });
}

export function useHrEmployeeProjects(userId: string) {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "employeeProjects", userId] as const,
    queryFn: () =>
      apiClient.get<Record<string, unknown>[]>("/hr/employees/projects", { userId }),
    enabled: !!userId,
  });
}

export function useHrEmployeeTickets(userId: string) {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "employeeTickets", userId] as const,
    queryFn: () =>
      apiClient.get<{ data: Record<string, unknown>[] }>("/hr/employees/tickets", { userId }),
    enabled: !!userId,
  });
}

export function useOnboardEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: OnboardEmployeeInput) =>
      apiClient.post<{ success: boolean }>("/hr/employees/onboard", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.all }),
  });
}

export function useCheckEmailExists() {
  return useMutation({
    mutationFn: (email: string) =>
      apiClient.get<{ exists: boolean }>("/hr/employees/check-email", { email }),
  });
}


export type AvailabilityStatus = "ON_LEAVE" | "HALF_DAY" | "AVAILABLE";

export interface AvailabilityEntry {
  userId: string;
  status: AvailabilityStatus;
  leaveType?: string;
}

export function useEmployeeAvailability(userIds?: string[]) {
  const param = userIds ? userIds.join(",") : undefined;
  return useQuery({
    queryKey: [...queryKeys.hr.all, "availability", param] as const,
    queryFn: () =>
      apiClient.get<AvailabilityEntry[]>("/hr/employees/availability", param ? { userIds: param } : undefined),
    staleTime: 5 * 60_000,
  });
}


export interface ExpertSkillLevel {
  name: string;
  /** Structured level from employee_skills; null if not rated in HR skills. */
  level: number | null;
  recognized: boolean;
}

export interface ExpertResult {
  userId: string;
  name: string | null;
  image: string | null;
  designation: string | null;
  role: string;
  department: string | null;
  branch: string | null;
  location: string | null;
  email: string | null;
  skills: string[];
  skillLevels: ExpertSkillLevel[];
  matchedSkill: string;
  matchedLevel: number | null;
  matchedRecognized: boolean;
  experienceYears: string | null;
  available: boolean;
  status: string;
  relevanceScore: number;
  isActive: boolean;
}

export type FindExpertParams =
  | string
  | {
      skill: string;
      department?: string;
      role?: string;
      branch?: string;
      includeInactive?: boolean;
    };

function normalizeFindExpertParams(params: FindExpertParams): {
  skill: string;
  department?: string;
  role?: string;
  branch?: string;
  includeInactive: boolean;
} {
  if (typeof params === "string") {
    return { skill: params, includeInactive: false };
  }
  return {
    skill: params.skill,
    department: params.department,
    role: params.role,
    branch: params.branch,
    includeInactive: params.includeInactive ?? false,
  };
}

export function useFindExpert(params: FindExpertParams) {
  const { skill, department, role, branch, includeInactive } = normalizeFindExpertParams(params);
  const trimmed = skill.trim();
  const query: Record<string, unknown> = { skill: trimmed };
  if (department) query.department = department;
  if (role) query.role = role;
  if (branch) query.branch = branch;
  if (includeInactive) query.includeInactive = "true";

  return useQuery({
    queryKey: [...queryKeys.hr.all, "findExpert", trimmed, department, role, branch, includeInactive] as const,
    queryFn: () => apiClient.get<ExpertResult[]>("/hr/employees/find-expert", query),
    enabled: trimmed.length > 0,
    staleTime: 2 * 60_000,
  });
}

export interface SkillSuggestion {
  skill: string;
  count: number;
  recognized: boolean;
  category: string | null;
}

export function useSkillSuggestions(q: string) {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "skillSuggestions", q] as const,
    queryFn: () => apiClient.get<SkillSuggestion[]>("/hr/employees/skill-suggestions", { q }),
    enabled: q.trim().length > 0,
    staleTime: 60_000,
  });
}


export interface DirectReport {
  id: string;
  name: string | null;
  image: string | null;
  designation: string | null;
  email: string;
}

export function useDirectReports(employeeId: string) {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "directReports", employeeId] as const,
    queryFn: () => apiClient.get<DirectReport[]>(`/hr/employees/${employeeId}/reports-to-me`),
    enabled: !!employeeId,
    staleTime: 5 * 60_000,
  });
}


export interface ManagerScorecard {
  managerId: string;
  teamSize: number;
  avgPerformanceRating: number | null;
  teamAttendanceRate: number | null;
  pendingLeaveRequests: number;
  directReports: Array<{
    id: string;
    name: string | null;
    image: string | null;
    designation: string | null;
    avgRating: number | null;
  }>;
}

export function useManagerScorecard(employeeId: string) {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "managerScorecard", employeeId] as const,
    queryFn: () =>
      apiClient.get<ManagerScorecard>(`/hr/employees/${employeeId}/manager-scorecard`),
    enabled: !!employeeId,
    staleTime: 5 * 60_000,
  });
}
