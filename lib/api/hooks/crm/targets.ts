"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Target,
  TargetHistory,
  TargetFilters,
  TargetLeaderboardEntry,
  CreateTargetInput,
  UpdateTargetInput,
  LogTargetProgressInput,
} from "@/types/crm";

export interface SalesQuota {
  id: number;
  userId: string;
  userName: string | null;
  period: string;
  startDate: string;
  endDate: string;
  targetRevenue: string;
  actualRevenue: string;
  attainmentPct: number;
  notes: string | null;
  createdAt: string | null;
}

export function useTargets(filters?: TargetFilters) {
  return useQuery({
    queryKey: queryKeys.targets.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<Target[]>("/targets", filters as Record<string, unknown>),
  });
}

export function useMyTargets() {
  return useQuery({
    queryKey: queryKeys.targets.myTargets(),
    queryFn: () => apiClient.get<Target[]>("/targets/my"),
  });
}

export function useTargetLeaderboard(metricType?: string) {
  return useQuery({
    queryKey: queryKeys.targets.leaderboard(metricType),
    queryFn: () =>
      apiClient.get<TargetLeaderboardEntry[]>(
        "/targets/leaderboard",
        metricType ? { metricType } : undefined
      ),
  });
}

export function useTargetHistory(targetId: number) {
  return useQuery({
    queryKey: queryKeys.targets.history(targetId),
    queryFn: () => apiClient.get<TargetHistory[]>(`/targets/${targetId}/history`),
    enabled: targetId > 0,
  });
}

export function useCreateTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTargetInput) =>
      apiClient.post<Target[]>("/targets", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.targets.all });
    },
  });
}

export function useUpdateTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateTargetInput) =>
      apiClient.patch<Target>(`/targets/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.targets.all });
    },
  });
}

export function useLogTargetProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: LogTargetProgressInput) =>
      apiClient.patch<Target>(`/targets/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.targets.all });
    },
  });
}

