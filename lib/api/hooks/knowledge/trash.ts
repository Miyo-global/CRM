"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { kbCollection, kbPurgeImpactSchema, kbTrashItemSchema } from "./schemas";

export interface KbPurgeResult {
  purged: number[];
  /** Left alone because they are on legal hold. */
  held: number[];
  /** Pages whose stored files could not all be removed; the row survives. */
  incomplete: number[];
}

export interface KbTrashFilters extends Record<string, unknown> {
  deletedBy?: string;
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
      apiClient.get<{ items: { id: string | null; name: string | null; pages: number }[] }>(
        "/knowledge/pages/trash/deleters",
      ),
  });
}

export function useRestoreKbPages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) =>
      apiClient.post<{ results: { id: number; status: string; reason?: string }[] }>(
        "/knowledge/pages/trash/restore",
        { ids },
      ),
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
    mutationFn: async (ids: number[]) =>
      kbPurgeImpactSchema.parse(
        await apiClient.post("/knowledge/pages/trash/purge-impact", { ids }),
      ),
  });
}

export function usePurgeKbPages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) =>
      apiClient.post<KbPurgeResult>("/knowledge/pages/trash/purge", { ids }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.all });
    },
  });
}

export function useEmptyKbTrash() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<KbPurgeResult>("/knowledge/pages/trash/empty"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.all });
    },
  });
}
