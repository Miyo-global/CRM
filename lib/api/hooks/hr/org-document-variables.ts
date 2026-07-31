"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface OrgDocumentVariable {
  id: number;
  orgId: string;
  slug: string;
  label: string;
  defaultValue: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export function useOrgDocumentVariables() {
  return useQuery({
    queryKey: queryKeys.hr.orgDocumentVariables(),
    queryFn: () => apiClient.get<OrgDocumentVariable[]>("/hr/documents/variables"),
  });
}

export function useCreateOrgDocumentVariable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { slug: string; label: string; defaultValue?: string }) =>
      apiClient.post<OrgDocumentVariable>("/hr/documents/variables", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.orgDocumentVariables() });
    },
  });
}

export function useUpdateOrgDocumentVariable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: number;
      slug?: string;
      label?: string;
      defaultValue?: string;
    }) => apiClient.patch<OrgDocumentVariable>(`/hr/documents/variables/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.orgDocumentVariables() });
    },
  });
}

export function useDeleteOrgDocumentVariable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/documents/variables/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.orgDocumentVariables() });
    },
  });
}
