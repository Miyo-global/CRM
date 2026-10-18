"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { kbCollection, kbPageReviewSchema } from "./schemas";

const reviewCollection = kbCollection(kbPageReviewSchema);

export interface KbReviewFilters extends Record<string, unknown> {
  status?: string;
  reviewerId?: string;
  spaceId?: number;
  contentType?: string;
  cursor?: string;
  limit?: number;
}

export function useKbReviews(filters: KbReviewFilters = {}) {
  return useQuery({
    queryKey: queryKeys.knowledge.reviews(filters),
    queryFn: async () =>
      reviewCollection.parse(await apiClient.get("/knowledge/page-reviews", { ...filters })),
  });
}

export function useKbReviewsDue() {
  return useQuery({
    queryKey: queryKeys.knowledge.reviewsDue(),
    queryFn: async () => reviewCollection.parse(await apiClient.get("/knowledge/page-reviews/due")),
  });
}

export function useKbPageReviews(pageId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.knowledge.pageReviews(pageId ?? 0),
    queryFn: async () =>
      reviewCollection.parse(await apiClient.get(`/knowledge/pages/${pageId}/reviews`)),
    enabled: !!pageId,
  });
}

export function useRequestKbPageReview(pageId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { reviewerId: string; dueAt?: string; note?: string }) =>
      apiClient.post(`/knowledge/pages/${pageId}/reviews`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.pageReviews(pageId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.reviewsAll() });
    },
  });
}

export function useDecideKbReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { reviewId: number; decision: "approve" | "reject"; note?: string }) =>
      apiClient.post(`/knowledge/page-reviews/${input.reviewId}/${input.decision}`, {
        note: input.note,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.reviewsAll() });
    },
  });
}

/**
 * One call per batch, with a result per row: a bulk decision where one page
 * has since been edited should report that row, not fail the batch.
 */
export function useBulkDecideKbReviews() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      reviewIds: number[];
      decision: "approve" | "reject";
      note?: string;
    }) =>
      apiClient.post<{
        results: { reviewId: number; status: "decided" | "failed"; reason?: string }[];
      }>("/knowledge/page-reviews/bulk-decide", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.reviewsAll() });
    },
  });
}
