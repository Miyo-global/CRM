"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface TerminationReason {
  id: number;
  orgId: string;
  label: string;
  description: string | null;
  isActive: boolean | null;
  sortOrder: number | null;
  createdById: string | null;
  createdAt: string | null;
}

export interface CreateTerminationReasonInput {
  label: string;
  description?: string;
}

export interface UpdateTerminationReasonInput {
  id: number;
  label?: string;
  description?: string | null;
  isActive?: boolean;
}

const terminationReasonKeys = {
  all: [...queryKeys.hr.all, "termination-reasons"] as const,
  list: () => [...terminationReasonKeys.all, "list"] as const,
};

export function useTerminationReasons() {
  return useQuery({
    queryKey: terminationReasonKeys.list(),
    queryFn: () => apiClient.get<TerminationReason[]>("/hr/termination-reasons"),
  });
}

export function useCreateTerminationReason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTerminationReasonInput) =>
      apiClient.post<TerminationReason>("/hr/termination-reasons", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: terminationReasonKeys.all }),
  });
}

export function useUpdateTerminationReason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateTerminationReasonInput) =>
      apiClient.patch<TerminationReason>(`/hr/termination-reasons/${id}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: terminationReasonKeys.all }),
  });
}
