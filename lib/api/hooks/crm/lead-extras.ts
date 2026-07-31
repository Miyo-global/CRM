"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";


export interface DuplicateLeadEntry {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  source: string | null;
  createdAt: string | null;
}

export interface DuplicateGroup {
  leads: DuplicateLeadEntry[];
  matchReason: string[];
  score: number;
}

export function useDuplicateLeads() {
  return useQuery({
    queryKey: queryKeys.leads.duplicates(),
    queryFn: () => apiClient.get<{ groups: DuplicateGroup[]; total: number }>("/leads/duplicates"),
    staleTime: 2 * 60 * 1000,
  });
}

export interface MergeLeadInput {
  keepLeadId: number;
  mergeLeadId: number;
}

export function useMergeLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ keepLeadId, mergeLeadId }: MergeLeadInput) =>
      apiClient.post<{ merged: boolean; winner: DuplicateLeadEntry }>("/leads/merge", {
        winnerId: keepLeadId,
        loserId: mergeLeadId,
        overrides: {},
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.leads.duplicates() });
      void qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useUpdateLeadCustomData() {
  return useMutation({
    mutationFn: ({ id, customData }: { id: number; customData: Record<string, unknown> }) =>
      apiClient.patch<{ customData: Record<string, unknown> }>(`/leads/${id}/custom-data`, {
        customData,
      }),
  });
}
