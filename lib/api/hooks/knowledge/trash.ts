"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { kbCollection, kbPurgeImpactSchema, kbTrashItemSchema } from "./schemas";

export interface KbTrashFilters extends Record<string, unknown> {
  q?: string;
  deletedById?: string;
  cursor?: string;
  limit?: number;
}

export function useKbTrash(filters: KbTrashFilters = {}) {
  return useQuery({
    queryKey: queryKeys.knowledge.trash(filters),
    queryFn: async () =>
      kbCollection(kbTrashItemSchema).parse(
        await apiClient.get("/knowledge/pages/trash", { ...filters }),
      ),
  });
}

/** Who has deleted something, for the filter. */
export function useKbTrashDeleters() {
  return useQuery({
    queryKey: queryKeys.knowledge.trashDeleters(),
    queryFn: () =>
      apiClient.get<{ items: { id: string; name: string | null; count: number }[] }>(
        "/knowledge/pages/trash/deleters",
      ),
  });
}

export function useRestoreKbPages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pageIds: number[]) =>
      apiClient.post("/knowledge/pages/trash/restore", { pageIds }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.all });
    },
  });
}

/**
 * What a purge would destroy, shown before the confirmation. A purge cannot be
 * undone, so the count comes from the server rather than from the list in view.
 */
export function useKbPurgeImpact() {
  return useMutation({
    mutationFn: async (pageIds: number[]) =>
      kbPurgeImpactSchema.parse(
        await apiClient.post("/knowledge/pages/trash/purge-impact", { pageIds }),
      ),
  });
}

export function usePurgeKbPages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pageIds: number[]) => apiClient.post("/knowledge/pages/trash/purge", { pageIds }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.all });
    },
  });
}

export function useEmptyKbTrash() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post("/knowledge/pages/trash/empty"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.all });
    },
  });
}
