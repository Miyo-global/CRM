"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Deal,
  DealActivity,
  DealFilters,
  DealsListResult,
  CreateDealInput,
  UpdateDealInput,
  UpdateDealStageInput,
  LogDealActivityInput,
} from "@/types/crm";

export type { DealActivity };

export interface DealForecast {
  totalWeighted: number;
  totalBestCase: number;
  totalDeals: number;
  byMonth: Array<{ month: string; label: string; weighted: number; bestCase: number; dealCount: number }>;
  byStage: Array<{ stage: string; count: number; totalValue: number; weightedValue: number; avgProbability: number }>;
}

export function useDeals(filters?: DealFilters) {
  return useQuery({
    queryKey: queryKeys.deals.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<DealsListResult>("/deals", filters as Record<string, unknown>),
  });
}

export function useDealForecast() {
  return useQuery({
    queryKey: queryKeys.deals.forecast(),
    queryFn: () => apiClient.get<DealForecast>("/deals/forecast"),
  });
}

export function useDealDetail(id: number) {
  return useQuery({
    queryKey: queryKeys.deals.detail(id),
    queryFn: () => apiClient.get<Deal>(`/deals/${id}`),
    enabled: id > 0,
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDealInput) => apiClient.post<Deal>("/deals", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.all });
    },
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateDealInput) =>
      apiClient.patch<Deal>(`/deals/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.all });
      qc.invalidateQueries({ queryKey: queryKeys.deals.detail(vars.id) });
    },
  });
}

export function useUpdateDealStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage, lostReason, version }: UpdateDealStageInput) =>
      apiClient.patch<Deal>(`/deals/${id}`, { stage, lostReason, version }),
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: queryKeys.deals.all });
      const previous = qc.getQueryData<Deal[]>(queryKeys.deals.all);
      if (previous) {
        qc.setQueryData<Deal[]>(
          queryKeys.deals.all,
          previous.map((d) => (d.id === id ? { ...d, stage: stage as Deal["stage"] } : d))
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.deals.all, context.previous);
      }
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.all });
      qc.invalidateQueries({ queryKey: queryKeys.deals.detail(vars.id) });
    },
  });
}

export function useDealActivities(dealId: number, limit?: number) {
  return useQuery({
    queryKey: queryKeys.dealActivities.list(dealId, limit ? { limit } : undefined),
    queryFn: () =>
      apiClient.get<DealActivity[]>(
        `/deals/${dealId}/activities`,
        limit ? { limit } : undefined
      ),
    enabled: dealId > 0,
  });
}

export function useLogDealActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, ...data }: LogDealActivityInput) =>
      apiClient.post<DealActivity>(`/deals/${dealId}/activities`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.dealActivities.list(vars.dealId) });
      qc.invalidateQueries({ queryKey: queryKeys.deals.detail(vars.dealId) });
    },
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/deals/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.all });
    },
  });
}

export function useCloneDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.post<Deal>(`/deals/${id}/clone`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.all });
    },
  });
}


export interface DealMeeting {
  id: number;
  orgId: string;
  dealId: number;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  attendees: string[] | null;
  agenda: string | null;
  notes: string | null;
  actionItems: string | null;
  recordingLink: string | null;
  status: "scheduled" | "completed" | "cancelled";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; name: string | null } | null;
}

export interface CreateDealMeetingInput {
  title: string;
  scheduledAt: string;
  durationMinutes?: number;
  attendees?: string[];
  agenda?: string;
  notes?: string;
  actionItems?: string;
  recordingLink?: string;
  status?: "scheduled" | "completed" | "cancelled";
}

export function useDealMeetings(dealId: number) {
  return useQuery({
    queryKey: ["deals", dealId, "meetings"],
    queryFn: () => apiClient.get<DealMeeting[]>(`/deals/${dealId}/meetings`),
    enabled: dealId > 0,
  });
}

export function useCreateDealMeeting(dealId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDealMeetingInput) =>
      apiClient.post<DealMeeting>(`/deals/${dealId}/meetings`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals", dealId, "meetings"] });
    },
  });
}

export function useUpdateDealMeeting(dealId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ meetingId, ...data }: Partial<CreateDealMeetingInput> & { meetingId: number }) =>
      apiClient.patch<DealMeeting>(`/deals/${dealId}/meetings/${meetingId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals", dealId, "meetings"] });
    },
  });
}

export function useDeleteDealMeeting(dealId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (meetingId: number) =>
      apiClient.delete<{ success: boolean }>(`/deals/${dealId}/meetings/${meetingId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals", dealId, "meetings"] });
    },
  });
}


export interface WinLossAnalysis {
  summary: {
    won: number;
    wonValue: number;
    lost: number;
    lostValue: number;
    total: number;
    winRate: number;
  };
  lostByReason: Array<{ reason: string; count: number; totalValue: number }>;
}

export function useWinLossAnalysis() {
  return useQuery({
    queryKey: ["deals", "win-loss"],
    queryFn: () => apiClient.get<WinLossAnalysis>("/deals/win-loss"),
  });
}


export function useDealApprovals(params?: { status?: string }) {
  return useQuery({
    queryKey: [...queryKeys.deals.all, "approvals", params] as const,
    queryFn: () => apiClient.get<Array<Record<string, unknown>>>("/deals/approvals", params as Record<string, unknown>),
  });
}

export function useDealApprovalRules() {
  return useQuery({
    queryKey: [...queryKeys.deals.all, "approvalRules"] as const,
    queryFn: () => apiClient.get<Array<{ id: number; minValue: string; approverRole: string; isActive: boolean; createdAt: string | null }>>("/deals/approval-rules"),
  });
}

export function useCreateDealApprovalRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { minValue: string; approverRole?: string }) =>
      apiClient.post("/deals/approval-rules", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.deals.all, "approvalRules"] }),
  });
}

export function useRequestDealApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { dealId: number; requestedStage: string }) =>
      apiClient.post("/deals/approvals", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.deals.all, "approvals"] }),
  });
}

export function useResolveDealApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { approvalId: number; action: "approve" | "reject"; rejectionReason?: string }) =>
      apiClient.post("/deals/approvals", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...queryKeys.deals.all, "approvals"] });
      qc.invalidateQueries({ queryKey: queryKeys.deals.all });
    },
  });
}

export function useUpdateDealCustomData() {
  return useMutation({
    mutationFn: ({ id, customData }: { id: number; customData: Record<string, unknown> }) =>
      apiClient.patch<{ customData: Record<string, unknown> }>(`/deals/${id}/custom-data`, {
        customData,
      }),
  });
}
