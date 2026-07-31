"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface RichDocument {
  id: number;
  orgId: string;
  title: string;
  contentJson: unknown;
  templateType: string | null;
  isPublished: boolean | null;
  version: number | null;
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

const richDocKeys = {
  all: [...queryKeys.hr.all, "richDocuments"] as const,
  list: () => [...richDocKeys.all, "list"] as const,
  detail: (id: number) => [...richDocKeys.all, "detail", id] as const,
};

export function useRichDocuments() {
  return useQuery({
    queryKey: richDocKeys.list(),
    queryFn: () => apiClient.get<RichDocument[]>("/hr/rich-documents"),
  });
}

export function useRichDocument(id: number) {
  return useQuery({
    queryKey: richDocKeys.detail(id),
    queryFn: () => apiClient.get<RichDocument>(`/hr/rich-documents/${id}`),
    enabled: !!id,
  });
}

export function useCreateRichDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; templateType?: string; contentJson?: unknown }) =>
      apiClient.post<RichDocument>("/hr/rich-documents", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: richDocKeys.list() }),
  });
}

export function useUpdateRichDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; title?: string; contentJson?: unknown }) =>
      apiClient.patch<{ success: boolean }>(`/hr/rich-documents/${id}`, data),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: richDocKeys.list() });
      qc.invalidateQueries({ queryKey: richDocKeys.detail(vars.id) });
    },
  });
}

export function useDeleteRichDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/rich-documents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: richDocKeys.list() }),
  });
}

export function usePublishRichDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.patch<{ success: boolean }>(`/hr/rich-documents/${id}/publish`),
    onSuccess: (_res, id) => {
      qc.invalidateQueries({ queryKey: richDocKeys.list() });
      qc.invalidateQueries({ queryKey: richDocKeys.detail(id) });
    },
  });
}
