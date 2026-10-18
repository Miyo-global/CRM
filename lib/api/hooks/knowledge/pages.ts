"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import {
  kbCollection,
  kbPageSchema,
  kbPageSummarySchema,
  kbPageTreeNodeSchema,
  type KbPage,
  type KbPageSummary,
  type KbPageTreeNode,
} from "./schemas";

const pageCollection = kbCollection(kbPageSummarySchema);

export interface KbPageFilters extends Record<string, unknown> {
  /** all (default), private (mine), shared (granted to me), space, project. */
  scope?: "all" | "private" | "shared" | "space" | "project";
  q?: string;
  spaceId?: number;
  projectId?: number;
  status?: string;
  contentType?: string;
  ownerId?: string;
  tagId?: number;
  cursor?: string;
  limit?: number;
  sort?: string;
}

/** KB-0066: the page collection, cursor paged. */
export function useKbPages(filters: KbPageFilters = {}) {
  return useQuery({
    queryKey: queryKeys.knowledge.pages(filters),
    queryFn: async () =>
      pageCollection.parse(await apiClient.get("/knowledge/pages", { ...filters })),
  });
}

export function useKbPage(pageId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.knowledge.page(pageId ?? 0),
    queryFn: async () => kbPageSchema.parse(await apiClient.get(`/knowledge/pages/${pageId}`)),
    enabled: !!pageId,
  });
}

/**
 * One level of the tree at a time: a wiki with thousands of pages should not
 * send the whole tree to open one space.
 */
export function useKbPageTree(
  params: { spaceId?: number; parentId?: number; projectId?: number } = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.knowledge.pageTree(params),
    queryFn: async () =>
      kbCollection(kbPageTreeNodeSchema).parse(
        await apiClient.get("/knowledge/pages/tree", { ...params }),
      ),
    enabled: options.enabled ?? true,
  });
}

export function useKbRecentPages() {
  return useQuery({
    queryKey: queryKeys.knowledge.recentPages(),
    queryFn: async () => pageCollection.parse(await apiClient.get("/knowledge/pages/recent")),
  });
}

export function useKbFavoritePages() {
  return useQuery({
    queryKey: queryKeys.knowledge.favoritePages(),
    queryFn: async () => pageCollection.parse(await apiClient.get("/knowledge/pages/favorites")),
  });
}

export interface CreateKbPageInput {
  title?: string;
  spaceId?: number;
  parentId?: number;
  projectId?: number;
  visibility?: string;
  contentType?: string;
  templateId?: number;
  content?: unknown;
}

export function useCreateKbPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateKbPageInput) =>
      kbPageSchema.parse(await apiClient.post("/knowledge/pages", input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.all });
    },
  });
}

export interface UpdateKbPageInput {
  title?: string;
  content?: unknown;
  icon?: string | null;
  coverImageKey?: string | null;
  coverColor?: string | null;
  contentType?: string;
  ownerId?: string | null;
  /** The revision the editor had. The server answers 409 on a mismatch. */
  expectedRevision?: number;
  changeSummary?: string;
}

export function useUpdateKbPage(pageId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateKbPageInput) =>
      kbPageSchema.parse(await apiClient.patch(`/knowledge/pages/${pageId}`, input)),
    onSuccess: (page: KbPage) => {
      queryClient.setQueryData(queryKeys.knowledge.page(pageId), page);
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.pagesAll() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.pageTreeAll() });
    },
  });
}

export function useDeleteKbPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pageId: number) => apiClient.delete(`/knowledge/pages/${pageId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.all });
    },
  });
}

export function useMoveKbPage(pageId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { parentId?: number | null; spaceId?: number; sortOrder?: number }) =>
      apiClient.post(`/knowledge/pages/${pageId}/move`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.pageTreeAll() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.page(pageId) });
    },
  });
}

export function useDuplicateKbPage(pageId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { includeChildren?: boolean } = {}) =>
      kbPageSchema.parse(await apiClient.post(`/knowledge/pages/${pageId}/duplicate`, input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.all });
    },
  });
}

export function useToggleKbPageFavorite(pageId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (favorite: boolean) =>
      favorite
        ? apiClient.post(`/knowledge/pages/${pageId}/favorite`)
        : apiClient.delete(`/knowledge/pages/${pageId}/favorite`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.favoritePages() });
    },
  });
}

/**
 * Fire-and-forget: a recorded visit feeds Recent, and a failed one must never
 * interrupt opening a page.
 */
export function useRecordKbPageVisit() {
  return useMutation({
    mutationFn: (pageId: number) => apiClient.post(`/knowledge/pages/${pageId}/visit`),
    onError: () => {},
  });
}

/** Everyone who owns at least one page, for the owner filter. */
export function useKbPageOwners() {
  return useQuery({
    queryKey: queryKeys.knowledge.pageOwners(),
    queryFn: () =>
      apiClient.get<{ items: { id: string; name: string | null; image: string | null }[] }>(
        "/knowledge/pages/owners",
      ),
  });
}

export type { KbPage, KbPageSummary, KbPageTreeNode };
