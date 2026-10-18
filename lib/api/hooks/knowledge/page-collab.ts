"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import {
  kbAttachmentSchema,
  kbCollection,
  kbPageCommentSchema,
  kbPageGrantSchema,
  kbPageSummarySchema,
  kbPageVersionDetailSchema,
  kbPageVersionSchema,
  kbRecordLinkSchema,
  kbTranslationSchema,
} from "./schemas";

/** KB-0066: versions, comments, grants, backlinks, attachments and record links. */
export function useKbPageVersions(pageId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.knowledge.pageVersions(pageId ?? 0),
    queryFn: async () =>
      kbCollection(kbPageVersionSchema).parse(
        await apiClient.get(`/knowledge/pages/${pageId}/versions`),
      ),
    enabled: !!pageId,
  });
}

export function useKbPageVersion(pageId: number | undefined, versionNumber: number | undefined) {
  return useQuery({
    queryKey: queryKeys.knowledge.pageVersion(pageId ?? 0, versionNumber ?? 0),
    queryFn: async () =>
      kbPageVersionDetailSchema.parse(
        await apiClient.get(`/knowledge/pages/${pageId}/versions/${versionNumber}`),
      ),
    enabled: !!pageId && !!versionNumber,
  });
}

export function useRestoreKbPageVersion(pageId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionNumber: number) =>
      apiClient.post(`/knowledge/pages/${pageId}/versions/${versionNumber}/restore`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.page(pageId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.pageVersions(pageId) });
    },
  });
}

export function useKbPageBacklinks(pageId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.knowledge.pageBacklinks(pageId ?? 0),
    queryFn: async () =>
      kbCollection(kbPageSummarySchema).parse(
        await apiClient.get(`/knowledge/pages/${pageId}/backlinks`),
      ),
    enabled: !!pageId,
  });
}

export function useKbPageComments(pageId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.knowledge.pageComments(pageId ?? 0),
    queryFn: async () =>
      kbCollection(kbPageCommentSchema).parse(
        await apiClient.get(`/knowledge/pages/${pageId}/comments`),
      ),
    enabled: !!pageId,
  });
}

export function useCreateKbPageComment(pageId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      body: string;
      parentId?: number;
      anchorBlockIndex?: number;
      anchorQuote?: string;
    }) => apiClient.post(`/knowledge/pages/${pageId}/comments`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.pageComments(pageId) });
    },
  });
}

export function useUpdateKbPageComment(pageId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { commentId: number; body: string }) =>
      apiClient.patch(`/knowledge/page-comments/${input.commentId}`, { body: input.body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.pageComments(pageId) });
    },
  });
}

export function useResolveKbPageComment(pageId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { commentId: number; resolved: boolean }) =>
      apiClient.post(`/knowledge/page-comments/${input.commentId}/resolve`, {
        resolved: input.resolved,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.pageComments(pageId) });
    },
  });
}

export function useDeleteKbPageComment(pageId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: number) => apiClient.delete(`/knowledge/page-comments/${commentId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.pageComments(pageId) });
    },
  });
}

export function useKbPageGrants(pageId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.knowledge.pageGrants(pageId ?? 0),
    queryFn: async () =>
      kbCollection(kbPageGrantSchema).parse(
        await apiClient.get(`/knowledge/pages/${pageId}/grants`),
      ),
    enabled: !!pageId,
  });
}

/** People and roles that do not already hold a grant on this page. */
export function useKbGrantCandidates(pageId: number | undefined, q?: string) {
  return useQuery({
    queryKey: queryKeys.knowledge.grantCandidates(pageId ?? 0, q),
    queryFn: () =>
      apiClient.get<{
        users: { id: string; name: string | null; email: string; image: string | null }[];
        roles: string[];
      }>(`/knowledge/pages/${pageId}/grant-candidates`, { q }),
    enabled: !!pageId,
  });
}

export function useCreateKbPageGrant(pageId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId?: string; role?: string; access: string }) =>
      apiClient.post(`/knowledge/pages/${pageId}/grants`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.pageGrants(pageId) });
    },
  });
}

export function useRevokeKbPageGrant(pageId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (grantId: number) =>
      apiClient.delete(`/knowledge/pages/${pageId}/grants/${grantId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.pageGrants(pageId) });
    },
  });
}

export function useKbPageAttachments(pageId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.knowledge.pageAttachments(pageId ?? 0),
    queryFn: async () =>
      kbCollection(kbAttachmentSchema).parse(
        await apiClient.get(`/knowledge/pages/${pageId}/attachments`),
      ),
    enabled: !!pageId,
  });
}

export function useDetachKbAttachment(pageId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: number) =>
      apiClient.delete(`/knowledge/pages/${pageId}/attachments/${attachmentId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.pageAttachments(pageId) });
    },
  });
}

export function useKbPageRecordLinks(pageId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.knowledge.pageRecordLinks(pageId ?? 0),
    queryFn: async () =>
      kbCollection(kbRecordLinkSchema).parse(
        await apiClient.get(`/knowledge/pages/${pageId}/record-links`),
      ),
    enabled: !!pageId,
  });
}

export function useCreateKbRecordLink(pageId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { targetType: string; targetId: string }) =>
      apiClient.post(`/knowledge/pages/${pageId}/record-links`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.pageRecordLinks(pageId) });
    },
  });
}

export function useDeleteKbRecordLink(pageId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkId: number) => apiClient.delete(`/knowledge/record-links/${linkId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.pageRecordLinks(pageId) });
    },
  });
}

/** The pages linked to one CRM record, for a "Related knowledge" panel. */
export function useKbPagesForRecord(params: { targetType: string; targetId: string } | undefined) {
  return useQuery({
    queryKey: queryKeys.knowledge.recordPages(params ?? { targetType: "", targetId: "" }),
    queryFn: async () =>
      kbCollection(kbPageSummarySchema).parse(
        await apiClient.get("/knowledge/record-links/by-record", { ...params }),
      ),
    enabled: !!params?.targetId,
  });
}

export function useKbPageTranslations(pageId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.knowledge.pageTranslations(pageId ?? 0),
    queryFn: async () =>
      kbCollection(kbTranslationSchema).parse(
        await apiClient.get(`/knowledge/pages/${pageId}/translations`),
      ),
    enabled: !!pageId,
  });
}
