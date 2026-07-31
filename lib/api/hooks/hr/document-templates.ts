"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";


export interface DocumentTemplate {
  id: number;
  orgId: string;
  title: string;
  type: string;
  htmlContent: string;
  variables: string[];
  version: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CandidateDocument {
  id: number;
  candidateId: number;
  orgId: string;
  templateId: number | null;
  title: string;
  htmlContent: string;
  status: string;
  sentAt: string | null;
  viewedAt: string | null;
  signedAt: string | null;
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateDocumentTemplateInput {
  title: string;
  type: string;
  htmlContent: string;
  variables?: string[];
}

export interface UpdateDocumentTemplateInput {
  title?: string;
  type?: string;
  htmlContent?: string;
  variables?: string[];
}

export interface GenerateCandidateDocumentInput {
  templateId: number;
  variables: Record<string, string>;
}


export function useDocumentTemplates(type?: string) {
  const params = type ? { type } : undefined;
  return useQuery({
    queryKey: queryKeys.hr.documentTemplates(params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<DocumentTemplate[]>(
        "/hr/documents/templates",
        params as Record<string, unknown> | undefined
      ),
  });
}

export function useDocumentTemplate(id: number) {
  return useQuery({
    queryKey: queryKeys.hr.documentTemplate(id),
    queryFn: () => apiClient.get<DocumentTemplate>(`/hr/documents/templates/${id}`),
    enabled: !!id,
  });
}

export function useCreateDocumentTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDocumentTemplateInput) =>
      apiClient.post<DocumentTemplate>("/hr/documents/templates", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.documentTemplates() }),
  });
}

export function useUpdateDocumentTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateDocumentTemplateInput & { id: number }) =>
      apiClient.put<DocumentTemplate>(`/hr/documents/templates/${id}`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.documentTemplates() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.documentTemplate(variables.id) });
    },
  });
}

export function useDeleteDocumentTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/documents/templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.documentTemplates() }),
  });
}

export interface DocumentTemplateVersion {
  id: number;
  templateId: number;
  orgId: string;
  version: number;
  title: string;
  type: string;
  htmlContent: string;
  variables: string[];
  archivedAt: string | null;
  archivedBy: string;
}

export function useDocumentTemplateVersions(templateId: number) {
  return useQuery({
    queryKey: [...queryKeys.hr.documentTemplate(templateId), "versions"],
    queryFn: () =>
      apiClient.get<DocumentTemplateVersion[]>(
        `/hr/documents/templates/${templateId}/versions`
      ),
    enabled: !!templateId,
  });
}

export function useCandidateDocuments(candidateId: number) {
  return useQuery({
    queryKey: queryKeys.hr.candidateDocuments(candidateId),
    queryFn: () =>
      apiClient.get<CandidateDocument[]>(
        `/hr/recruitment/candidates/${candidateId}/documents`
      ),
    enabled: !!candidateId,
  });
}

export function useGenerateCandidateDocument(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GenerateCandidateDocumentInput) =>
      apiClient.post<CandidateDocument>(
        `/hr/recruitment/candidates/${candidateId}/documents`,
        data
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.candidateDocuments(candidateId) });
    },
  });
}
