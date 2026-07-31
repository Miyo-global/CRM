"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  PaginatedLeads,
  Lead,
  LeadWithActivities,
  LeadActivity,
  TimelineItem,
  LeadStats,
  LeadBoard,
  SlaAlertResponse,
  LeadAnalyticsSummary,
  LeadDashboardMetrics,
  SalesLeaderboardEntry,
  LeadClient,
  SalesTeamCapacityEntry,
  LeadFilters,
  CreateLeadInput,
  UpdateLeadInput,
  UpdateLeadStatusInput,
  AssignLeadInput,
  LogActivityInput,
  BulkUpdateLeadsInput,
  BulkDeleteLeadsInput,
  BulkImportLeadsInput,
  BulkImportResult,
  VerifyLeadInput,
  RejectLeadInput,
  DistributeLeadsInput,
  DistributeResult,
  LeadImportBatch,
} from "@/types/leads";

export function useLeads(filters?: LeadFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.leads.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<PaginatedLeads>("/leads", filters as Record<string, unknown>),
    ...(options?.enabled !== undefined ? { enabled: options.enabled } : {}),
  });
}

export function useLeadDetail(id: number) {
  return useQuery({
    queryKey: queryKeys.leads.detail(id),
    queryFn: () => apiClient.get<LeadWithActivities>(`/leads/${id}`),
    enabled: id > 0,
  });
}

export function useLeadBoard() {
  return useQuery({
    queryKey: queryKeys.leads.board(),
    queryFn: () => apiClient.get<LeadBoard>("/leads/board"),
  });
}

export function useLeadStats(filters?: { dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: queryKeys.leads.stats(filters),
    queryFn: () =>
      apiClient.get<LeadStats>("/leads/stats", filters as Record<string, unknown>),
  });
}

export function useLeadActivities(leadId: number, limit?: number) {
  return useQuery({
    queryKey: queryKeys.leads.activities(leadId),
    queryFn: () =>
      apiClient.get<LeadActivity[]>(`/leads/${leadId}/activities`, limit ? { limit } : undefined),
    enabled: leadId > 0,
  });
}

export function useLeadTimeline(leadId: number, limit?: number) {
  return useQuery({
    queryKey: queryKeys.leads.timeline(leadId),
    queryFn: () =>
      apiClient.get<TimelineItem[]>(`/leads/${leadId}/timeline`, limit ? { limit } : undefined),
    enabled: leadId > 0,
  });
}

export function useLeadSlaAlerts() {
  return useQuery({
    queryKey: queryKeys.leads.slaAlerts(),
    queryFn: () => apiClient.get<SlaAlertResponse>("/leads/sla-alerts"),
  });
}

export function useLeadAnalyticsSummary(filters?: {
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: queryKeys.leads.analyticsSummary(filters),
    queryFn: () =>
      apiClient.get<LeadAnalyticsSummary>("/leads/analytics", filters as Record<string, unknown>),
  });
}

export function useLeadDashboardMetrics() {
  return useQuery({
    queryKey: queryKeys.leads.dashboardMetrics(),
    queryFn: () => apiClient.get<LeadDashboardMetrics>("/leads/dashboard-metrics"),
  });
}

export function useUnverifiedLeads() {
  return useQuery({
    queryKey: queryKeys.leads.unverified(),
    queryFn: () => apiClient.get<Lead[]>("/leads/unverified"),
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLeadInput) =>
      apiClient.post<Lead>("/leads", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateLeadInput) =>
      apiClient.patch<Lead>(`/leads/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
      qc.invalidateQueries({ queryKey: queryKeys.leads.detail(vars.id) });
    },
  });
}

export function useUpdateLeadStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateLeadStatusInput) =>
      apiClient.patch<Lead>(`/leads/${input.leadId}/status`, input),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: queryKeys.leads.board() });
      const previousBoard = qc.getQueryData<LeadBoard>(queryKeys.leads.board());
      if (previousBoard) {
        const from = (vars.expectedStatus ??
          (Object.keys(previousBoard) as (keyof LeadBoard)[]).find((column) =>
            previousBoard[column]?.some((l) => l.id === vars.leadId)
          )) as keyof LeadBoard | undefined;
        const to = vars.status as keyof LeadBoard;
        const lead = from ? previousBoard[from]?.find((l) => l.id === vars.leadId) : undefined;
        if (from && lead) {
          qc.setQueryData<LeadBoard>(queryKeys.leads.board(), {
            ...previousBoard,
            [from]: previousBoard[from].filter((l) => l.id !== vars.leadId),
            [to]: [...(previousBoard[to] ?? []), { ...lead, status: vars.status }],
          });
        }
      }
      return { previousBoard };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousBoard) {
        qc.setQueryData(queryKeys.leads.board(), ctx.previousBoard);
      }
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.board() });
      qc.invalidateQueries({ queryKey: queryKeys.leads.detail(vars.leadId) });
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
      if (vars.status === "CONVERTED") {
        qc.invalidateQueries({ queryKey: queryKeys.clients.all });
      }
    },
  });
}

export function useLogLeadActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LogActivityInput) =>
      apiClient.post<LeadActivity>(`/leads/${input.leadId}/activities`, input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.activities(vars.leadId) });
      qc.invalidateQueries({ queryKey: queryKeys.leads.detail(vars.leadId) });
      qc.invalidateQueries({ queryKey: queryKeys.leads.timeline(vars.leadId) });
    },
  });
}

export function useBulkUpdateLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkUpdateLeadsInput) =>
      apiClient.patch<{ updated: number }>("/leads/bulk", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useBulkDeleteLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkDeleteLeadsInput) =>
      apiClient.delete<{ deleted: number }>("/leads/bulk", { data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useBulkImportLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkImportLeadsInput) =>
      apiClient.post<BulkImportResult>("/leads/import", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useVerifyLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, ...data }: VerifyLeadInput) =>
      apiClient.patch<Lead>(`/leads/${leadId}/verify`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
      qc.invalidateQueries({ queryKey: queryKeys.leads.unverified() });
    },
  });
}

export function useRejectLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, ...data }: RejectLeadInput) =>
      apiClient.patch<Lead>(`/leads/${leadId}/reject`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
      qc.invalidateQueries({ queryKey: queryKeys.leads.unverified() });
    },
  });
}

export function useDistributeLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DistributeLeadsInput) =>
      apiClient.post<DistributeResult>("/leads/distribute", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useSelfAssignLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leadId: number) =>
      apiClient.patch<Lead>(`/leads/${leadId}/self-assign`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useAssignLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignLeadInput) =>
      apiClient.patch<Lead>(`/leads/${input.leadId}/assign`, { assignedToId: input.assignedToId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useSalesLeaderboard() {
  return useQuery({
    queryKey: queryKeys.salesLeaderboard.list(),
    queryFn: () =>
      apiClient.get<SalesLeaderboardEntry[]>("/leads/sales-leaderboard"),
  });
}

export function useSalesTeamCapacity() {
  return useQuery({
    queryKey: queryKeys.salesTeamCapacity.list(),
    queryFn: () =>
      apiClient.get<SalesTeamCapacityEntry[]>("/leads/sales-team-capacity"),
  });
}

interface FollowUpLead {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  priority: string | null;
  followUpDate: string | null;
  followUpNotes: string | null;
  assignedToId: string | null;
  assigneeName: string | null;
}

export function useOverdueFollowUps(limit?: number) {
  return useQuery({
    queryKey: [...queryKeys.leads.all, "followUps", "overdue"] as const,
    queryFn: () =>
      apiClient.get<{ items: FollowUpLead[]; total: number }>(
        "/leads/follow-ups",
        { overdue: "true", limit: limit ?? 10 } as Record<string, unknown>,
      ),
  });
}

interface DuplicateCheckResult {
  duplicates: Array<{
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    status: string;
    createdAt: string | null;
  }>;
}

export function useCheckLeadDuplicates(params: { email?: string; phone?: string }, options?: { enabled?: boolean }) {
  const hasParams = !!(params.email || params.phone);
  return useQuery({
    queryKey: [...queryKeys.leads.all, "duplicateCheck", params] as const,
    queryFn: () => apiClient.get<DuplicateCheckResult>("/leads/check-duplicates", params as Record<string, unknown>),
    enabled: hasParams && (options?.enabled !== false),
    staleTime: 30_000,
  });
}

export function useLeadImportStatus(batchId: number | null) {
  return useQuery({
    queryKey: [...queryKeys.leads.all, "importBatch", batchId] as const,
    queryFn: () => apiClient.get<LeadImportBatch>(`/leads/import/${batchId}`),
    enabled: batchId !== null,
    refetchInterval: 3000,
  });
}

export const useSlaAlerts = useLeadSlaAlerts;

export interface ScoreExplanation {
  score: number;
  totalRules: number;
  firedRules: { name: string; field: string; operator: string; value: string; points: number }[];
}

export function useLeadScoreExplanation(leadId: number, enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.leads.all, "scoreExplanation", leadId] as const,
    queryFn: () => apiClient.get<ScoreExplanation>(`/leads/${leadId}/score-explanation`),
    enabled,
    staleTime: 60_000,
  });
}
