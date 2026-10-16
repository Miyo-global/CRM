"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type CycleDetail = {
  cycle: { id: number; name: string; description: string | null; status: "draft" | "active" | "completed"; startDate: string; endDate: string };
  tickets: { id: number; title: string; ticketNumber: number; status: string; priority: string | null; points: number | null; assigneeName: string | null }[];
  stats: { total: number; done: number; points: number; donePoints: number };
  carryTargets: { id: number; name: string; status: string }[];
  velocity: { cycleId: number; name: string; points: number }[];
};

const detailKey = (projectId: number, cycleId: number) => [...queryKeys.projects.cycles(projectId), "detail", cycleId];

export function useCycleDetail(projectId: number, cycleId: number) {
  return useQuery<CycleDetail>({
    queryKey: detailKey(projectId, cycleId),
    queryFn: () => apiClient.get<CycleDetail>(`/projects/${projectId}/cycles/${cycleId}`),
    enabled: projectId > 0 && cycleId > 0,
    retry: false,
  });
}

export function useCompleteCycle(projectId: number, cycleId: number) {
  const queryClient = useQueryClient();
  return useMutation<{ carried: number }, Error, { carryForwardCycleId: number | null }>({
    mutationFn: ({ carryForwardCycleId }) =>
      apiClient.patch(`/projects/${projectId}/cycles/${cycleId}`, { status: "completed", carryForwardCycleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.cycles(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}
