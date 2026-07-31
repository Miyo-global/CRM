"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface JobRoleRow {
  id: number;
  title: string;
  departmentId: number | null;
  isActive: boolean | null;
  createdAt: string | null;
  departmentName: string | null;
}

// Local query keys for the job-role catalog. Deliberately not added to the
// shared lib/query-keys.ts; they share the same root prefix so the inline
// combobox's invalidation (["miyoglobal","hr","jobRoles"]) also refreshes this list.
export const JOB_ROLES_ALL_KEY = ["miyoglobal", "hr", "jobRoles"] as const;
const adminListKey = ["miyoglobal", "hr", "jobRoles", "admin"] as const;

export function useJobRolesAdmin() {
  return useQuery<JobRoleRow[], Error>({
    queryKey: adminListKey,
    queryFn: () =>
      apiClient.get<JobRoleRow[]>("/hr/job-roles", { includeInactive: "true" }),
  });
}

export function useCreateJobRole() {
  const qc = useQueryClient();
  return useMutation<
    { success: boolean; id?: number; reactivated?: boolean },
    Error,
    { title: string; departmentId: number | null }
  >({
    mutationFn: (data) => apiClient.post("/hr/job-roles", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: JOB_ROLES_ALL_KEY }),
  });
}

export function useUpdateJobRole() {
  const qc = useQueryClient();
  return useMutation<
    { success: boolean },
    Error,
    { id: number; title?: string; departmentId?: number | null; isActive?: boolean }
  >({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/hr/job-roles/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: JOB_ROLES_ALL_KEY }),
  });
}

export function useDeleteJobRole() {
  const qc = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (id) => apiClient.delete(`/hr/job-roles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: JOB_ROLES_ALL_KEY }),
  });
}
