"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { kbCollection, kbTagSchema, kbTemplateSchema } from "./schemas";

export function useKbTemplates() {
  return useQuery({
    queryKey: queryKeys.knowledge.templates(),
    queryFn: async () =>
      kbCollection(kbTemplateSchema).parse(await apiClient.get("/knowledge/page-templates")),
  });
}

export function useKbTemplate(templateId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.knowledge.template(templateId ?? 0),
    queryFn: async () =>
      kbTemplateSchema.parse(await apiClient.get(`/knowledge/page-templates/${templateId}`)),
    enabled: !!templateId,
  });
}

export interface KbTemplateInput {
  name: string;
  description?: string | null;
  icon?: string | null;
  contentType?: string;
  content?: unknown;
}

export function useCreateKbTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: KbTemplateInput) => apiClient.post("/knowledge/page-templates", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.templates() });
    },
  });
}

export function useUpdateKbTemplate(templateId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<KbTemplateInput>) =>
      apiClient.patch(`/knowledge/page-templates/${templateId}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.templates() });
    },
  });
}

export function useDeleteKbTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (templateId: number) =>
      apiClient.delete(`/knowledge/page-templates/${templateId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.templates() });
    },
  });
}

export function useKbTags() {
  return useQuery({
    queryKey: queryKeys.knowledge.tags(),
    queryFn: async () => kbCollection(kbTagSchema).parse(await apiClient.get("/knowledge/tags")),
  });
}

export function useCreateKbTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; color?: string | null }) =>
      apiClient.post("/knowledge/tags", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.tags() });
    },
  });
}

export function useKbPageTags(pageId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.knowledge.pageTags(pageId ?? 0),
    queryFn: async () =>
      kbCollection(kbTagSchema).parse(await apiClient.get(`/knowledge/pages/${pageId}/tags`)),
    enabled: !!pageId,
  });
}

/** PUT replaces the whole set, so the sheet sends what the page should end up with. */
export function useSetKbPageTags(pageId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tagIds: number[]) => apiClient.put(`/knowledge/pages/${pageId}/tags`, { tagIds }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.pageTags(pageId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.tags() });
    },
  });
}
