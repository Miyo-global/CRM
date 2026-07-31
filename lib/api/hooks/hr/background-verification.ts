"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface BackgroundVerification {
  id: number;
  userId: string;
  type: string;
  status: string | null;
  provider: string | null;
  referenceNumber: string | null;
  result: string | null;
  notes: string | null;
  completedAt: Date | string | null;
  createdAt: Date | string | null;
  user?: { id: string; name: string | null; email: string } | null;
}

const bgvKeys = {
  all: [...queryKeys.hr.all, "bgv"] as const,
  list: () => [...bgvKeys.all, "list"] as const,
};

export function useBackgroundVerifications() {
  return useQuery({
    queryKey: bgvKeys.list(),
    queryFn: () => apiClient.get<BackgroundVerification[]>("/hr/background-verification"),
  });
}

export function useCreateBackgroundVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string; type: string; provider?: string; referenceNumber?: string; notes?: string }) =>
      apiClient.post<BackgroundVerification>("/hr/background-verification", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: bgvKeys.list() }),
  });
}

export function useUpdateBackgroundVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: number; status?: string; result?: string; notes?: string }) =>
      apiClient.patch<{ success: boolean }>("/hr/background-verification", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: bgvKeys.list() }),
  });
}
