"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { kbSearchResponseSchema } from "./schemas";

export interface KbSearchParams extends Record<string, unknown> {
  q: string;
  spaceId?: number;
  status?: string;
  contentType?: string;
  ownerId?: string;
  tagId?: number;
  updatedAfter?: string;
  cursor?: string;
  limit?: number;
}

/**
 * KB-0066: page search. It runs on the page collection's title filter (`q`):
 * there is no separate search endpoint, and calling one 404'd (R3-KB-01).
 *
 * `mode` comes back as `keyword` when there is no embedding key, so the UI can
 * say so instead of quietly returning worse results.
 */
export function useKbPageSearch(params: KbSearchParams, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.knowledge.search(params),
    queryFn: async () =>
      kbSearchResponseSchema.parse(await apiClient.get("/knowledge/pages", { ...params })),
    enabled: (options.enabled ?? true) && params.q.trim().length > 0,
    // A search result list is cheap to refetch and goes stale as pages change.
    staleTime: 30_000,
  });
}
