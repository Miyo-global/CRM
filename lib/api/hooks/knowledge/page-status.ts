"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

/**
 * KB-0066: the page state changes that are their own endpoint rather than a
 * PATCH field, because each one has its own permission and audit entry.
 */
function usePageAction<TInput = void>(pageId: number, path: string, method: "post" | "patch" = "post") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) =>
      method === "post"
        ? apiClient.post(`/knowledge/pages/${pageId}/${path}`, input)
        : apiClient.patch(`/knowledge/pages/${pageId}/${path}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.page(pageId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.pagesAll() });
    },
  });
}

export function usePublishKbPage(pageId: number) {
  return usePageAction<{ visibility?: string }>(pageId, "publish");
}

export function useArchiveKbPage(pageId: number) {
  return usePageAction(pageId, "archive");
}

export function useUnarchiveKbPage(pageId: number) {
  return usePageAction(pageId, "unarchive");
}

export function useLockKbPage(pageId: number) {
  return usePageAction<{ locked: boolean }>(pageId, "lock");
}

export function useSetKbPageVisibility(pageId: number) {
  return usePageAction<{ visibility: string; spaceId?: number }>(pageId, "visibility");
}

export function useVerifyKbPage(pageId: number) {
  return usePageAction<{ note?: string }>(pageId, "verify");
}

export function useMarkKbPageStale(pageId: number) {
  return usePageAction<{ reason?: string }>(pageId, "mark-stale");
}
