"use client";

import { z } from "zod";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { kbCollection, kbSpaceMemberSchema, kbSpaceSchema, type KbSpace } from "./schemas";

export interface KbSpaceFilters extends Record<string, unknown> {
  type?: string;
  includeArchived?: boolean;
  q?: string;
}

const kbSpaceListSchema = z.array(kbSpaceSchema).transform((items) => ({ items }));

export function useKbSpaces(filters: KbSpaceFilters = {}) {
  return useQuery({
    queryKey: queryKeys.knowledge.spaces(filters),
    queryFn: async () =>
      // The route returns a bare array; reading it as { items } failed on every
      // wiki page and left the editor read-only (FR1-001).
      kbSpaceListSchema.parse(await apiClient.get("/knowledge/spaces", { ...filters })),
  });
}

export function useKbSpace(spaceId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.knowledge.space(spaceId ?? 0),
    queryFn: async () => kbSpaceSchema.parse(await apiClient.get(`/knowledge/spaces/${spaceId}`)),
    enabled: !!spaceId,
  });
}

export interface KbSpaceInput {
  name: string;
  slug?: string;
  description?: string | null;
  type?: string;
  audience?: string;
  color?: string | null;
  icon?: string | null;
  defaultVisibility?: string;
}

export function useCreateKbSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: KbSpaceInput) =>
      kbSpaceSchema.parse(await apiClient.post("/knowledge/spaces", input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.spacesAll() });
    },
  });
}

export function useUpdateKbSpace(spaceId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<KbSpaceInput>) =>
      kbSpaceSchema.parse(await apiClient.patch(`/knowledge/spaces/${spaceId}`, input)),
    onSuccess: (space: KbSpace) => {
      queryClient.setQueryData(queryKeys.knowledge.space(spaceId), space);
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.spacesAll() });
    },
  });
}

export interface KbSpaceArchiveImpact {
  pages: number;
  published: number;
  /** Share links archiving will revoke. */
  publicLinks: number;
  linkedDocuments: number;
}

/** What archiving would hide and revoke, shown before the confirmation. */
export function useKbSpaceArchiveImpact(spaceId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.knowledge.spaceArchiveImpact(spaceId ?? 0),
    queryFn: () =>
      apiClient.get<{
        space: { id: number; name: string; archivedAt: string | null };
        impact: KbSpaceArchiveImpact;
      }>(`/knowledge/spaces/${spaceId}/archive-impact`),
    enabled: !!spaceId,
  });
}

export function useArchiveKbSpace(spaceId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (archive: boolean) =>
      apiClient.post(`/knowledge/spaces/${spaceId}/${archive ? "archive" : "restore"}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.all });
    },
  });
}

export function useKbSpaceMembers(spaceId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.knowledge.spaceMembers(spaceId ?? 0),
    queryFn: async () =>
      kbCollection(kbSpaceMemberSchema).parse(
        await apiClient.get(`/knowledge/spaces/${spaceId}/members`),
      ),
    enabled: !!spaceId,
  });
}

export function useAddKbSpaceMember(spaceId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId?: string; role?: string; spaceRole: string }) =>
      apiClient.post(`/knowledge/spaces/${spaceId}/members`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.spaceMembers(spaceId) });
    },
  });
}

export function useUpdateKbSpaceMember(spaceId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { memberId: number; spaceRole: string }) =>
      apiClient.patch(`/knowledge/spaces/${spaceId}/members/${input.memberId}`, {
        spaceRole: input.spaceRole,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.spaceMembers(spaceId) });
    },
  });
}

export function useRemoveKbSpaceMember(spaceId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: number) =>
      apiClient.delete(`/knowledge/spaces/${spaceId}/members/${memberId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.spaceMembers(spaceId) });
    },
  });
}

export type { KbSpace };
