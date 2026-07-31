"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

const keys = {
  list: (params?: Record<string, unknown>) => [...queryKeys.hr.appraisals(params)] as const,
  detail: (id: number) => queryKeys.hr.appraisal(id),
  categories: () => queryKeys.hr.appraisalCategories(),
};

export function useAppraisalCategories() {
  return useQuery({
    queryKey: keys.categories(),
    queryFn: () =>
      apiClient.get<
        {
          id: number;
          slug: string;
          name: string;
          ratingType: string;
          weight: string;
          sortOrder: number;
        }[]
      >("/hr/performance/appraisals/categories"),
  });
}

export function useAppraisals(params?: { myActions?: boolean; userId?: string }) {
  const sp = new URLSearchParams();
  if (params?.myActions) sp.set("myActions", "1");
  if (params?.userId) sp.set("userId", params.userId);
  const q = sp.toString();
  return useQuery({
    queryKey: keys.list(params),
    queryFn: () => apiClient.get<unknown[]>(`/hr/performance/appraisals${q ? `?${q}` : ""}`),
  });
}

export function useAppraisal(id: number | null) {
  return useQuery({
    queryKey: keys.detail(id ?? 0),
    queryFn: () => apiClient.get<unknown>(`/hr/performance/appraisals/${id}`),
    enabled: !!id && id > 0,
  });
}

export function useCreateAppraisal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      userId: string;
      reviewerId?: string | null;
      cycleId?: number;
      type: string;
      periodStart: string;
      periodEnd: string;
      dueDate?: string;
      confidentialityNote?: string;
    }) => apiClient.post<unknown>("/hr/performance/appraisals", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "appraisals"] });
    },
  });
}

export function usePatchAppraisalMeta(appraisalId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      outcomeNotes?: string | null;
      confidentialityNote?: string | null;
      calibratedRating?: number | null;
      hrCalibrationNotes?: string | null;
      proposedSalary?: number | null;
      salaryIncrementPct?: number | null;
      promotionRecommended?: boolean;
      proposedDesignation?: string | null;
      appraisalLetterUrl?: string | null;
      discussionScheduledAt?: string | null;
      discussionNotes?: string | null;
    }) =>
      apiClient.patch<unknown>(`/hr/performance/appraisals/${appraisalId}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.detail(appraisalId) });
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "appraisals"] });
    },
  });
}

export function usePatchAppraisalRatings(appraisalId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      ratings: {
        categoryId: number;
        selfScore?: number | null;
        selfText?: string | null;
        managerScore?: number | null;
        managerComment?: string | null;
      }[];
    }) => apiClient.patch<unknown>(`/hr/performance/appraisals/${appraisalId}/ratings`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.detail(appraisalId) });
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "appraisals"] });
    },
  });
}

export function useCompleteAppraisalStage(appraisalId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data?: { comment?: string }) =>
      apiClient.post<{ success: boolean }>(`/hr/performance/appraisals/${appraisalId}/complete-stage`, data ?? {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.detail(appraisalId) });
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "appraisals"] });
    },
  });
}

export function useReopenAppraisal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post<unknown>(`/hr/performance/appraisals/${id}/reopen`, {}),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "appraisals"] });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.appraisal(id) });
    },
  });
}

export function useExportAppraisalPdf() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/hr/performance/appraisals/${id}/export`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.blob();
    },
  });
}
