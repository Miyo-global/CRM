"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface KeyResult {
  id: number;
  goalId: number;
  title: string;
  targetValue: string | null;
  currentValue: string | null;
  unit: string | null;
  progress: number | null;
}

export function useKeyResults(goalId: number) {
  return useQuery({
    queryKey: [...queryKeys.hr.goals(), "keyResults", goalId] as const,
    queryFn: () => apiClient.get<KeyResult[]>("/hr/performance/key-results", { goalId }),
    enabled: !!goalId,
  });
}

export function useCreateKeyResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { goalId: number; title: string; targetValue?: number; unit?: string }) =>
      apiClient.post<KeyResult>("/hr/performance/key-results", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.goals() }),
  });
}

export function useUpdateKeyResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: number; currentValue?: number; progress?: number }) =>
      apiClient.patch<{ success: boolean }>("/hr/performance/key-results", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.goals() }),
  });
}
