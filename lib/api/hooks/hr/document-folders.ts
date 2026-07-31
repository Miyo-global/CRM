"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface DocumentFolder {
  id: number;
  orgId: string;
  name: string;
  sortOrder: number;
  createdAt: string | null;
}

export function useDocumentFolders() {
  return useQuery({
    queryKey: queryKeys.hr.documentFolders(),
    queryFn: () => apiClient.get<DocumentFolder[]>("/hr/documents/folders"),
  });
}

export function useCreateDocumentFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) =>
      apiClient.post<DocumentFolder>("/hr/documents/folders", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.documentFolders() });
    },
  });
}

export function useDeleteDocumentFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/documents/folders/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.documentFolders() });
    },
  });
}
