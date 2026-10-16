"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface OrgLeaveType {
  id: number;
  name: string;
  daysPerYear: number;
  carryForward: boolean | null;
}

const leaveTypeKeys = { list: ["hr", "leave-types"] as const };

export function useOrgLeaveTypes() {
  return useQuery<OrgLeaveType[], Error>({
    queryKey: leaveTypeKeys.list,
    queryFn: () => apiClient.get<OrgLeaveType[]>("/hr/leave-types"),
  });
}

/** Edits an allowance so HR can change policy without a deploy (QA-0051). */
export function useUpdateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; daysPerYear?: number; carryForward?: boolean }) =>
      apiClient.patch<{ success: boolean }>(`/hr/leave-types/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: leaveTypeKeys.list }),
  });
}
