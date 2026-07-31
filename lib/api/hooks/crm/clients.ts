"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  ClientAccount,
  ClientAccountWithActivities,
  ClientActivity,
  ClientAccountFilters,
  PaginatedClientAccounts,
  UpdateClientAccountStatusInput,
  LogClientActivityInput,
  ClientAccountStats,
} from "@/types/crm";

export interface CrmAssignmentMember {
  userId: string;
  name: string | null;
  image: string | null;
  activeCount: number;
  totalCount: number;
}

export interface CrmAssignmentStats {
  members: CrmAssignmentMember[];
  unassignedCount: number;
}

export interface UpdateRenewalInput {
  accountId: number;
  renewalStage?: "upcoming" | "in_discussion" | "renewed" | "churned";
  renewalDate?: string | null;
  renewalNotes?: string | null;
}

export interface ClientHealth {
  id: number;
  name: string;
  company: string | null;
  healthScore: number | null;
  healthStatus: string | null;
  churnRiskScore: number | null;
  churnRiskReasoning: string | null;
  lastHealthCheck: string | null;
  investmentValue: string | null;
  status: string;
}

export interface ClientTimelineEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
  user?: string;
}

export interface SimpleClient {
  id: number;
  name: string;
}

export interface ClientOpportunity {
  id: number;
  orgId: string;
  clientId: number;
  title: string;
  type: "upsell" | "cross_sell";
  stage: "identified" | "proposed" | "negotiating" | "won" | "lost";
  value: string | null;
  notes: string | null;
  expectedCloseDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  client?: { id: number; name: string } | null;
}

export interface CreateClientOpportunityInput {
  clientId: number;
  title: string;
  type?: "upsell" | "cross_sell";
  stage?: "identified" | "proposed" | "negotiating" | "won" | "lost";
  value?: string;
  notes?: string;
  expectedCloseDate?: string;
}

export interface OnboardingTemplate {
  id: number;
  orgId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
}

export interface OnboardingItem {
  id: number;
  orgId: string;
  clientId: number;
  templateId: number | null;
  title: string;
  description: string | null;
  assignedTo: string | null;
  dueDate: string | null;
  completedAt: string | null;
  completedBy: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  assignee?: { id: string; name: string | null } | null;
}

export interface CsatSurvey {
  id: number;
  orgId: string;
  clientId: number | null;
  title: string;
  question: string;
  scaleMax: number;
  status: "draft" | "sent" | "closed";
  publicToken: string;
  sentAt: string | null;
  closedAt: string | null;
  createdBy: string;
  createdAt: string;
  responseCount?: number;
  avgRating?: number | null;
  client?: { id: number; name: string } | null;
}

export interface CsatResponse {
  id: number;
  surveyId: number;
  rating: number;
  comment: string | null;
  respondentName: string | null;
  respondentEmail: string | null;
  submittedAt: string;
}

export function useClientAccounts(filters?: ClientAccountFilters) {
  return useQuery({
    queryKey: queryKeys.clients.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<PaginatedClientAccounts>("/clients", filters as Record<string, unknown>),
  });
}

export function useClientAccount(id: number) {
  return useQuery({
    queryKey: queryKeys.clients.detail(id),
    queryFn: () => apiClient.get<ClientAccountWithActivities>(`/clients/${id}`),
    enabled: id > 0,
  });
}

export function useClientActivities(clientId: number) {
  return useQuery({
    queryKey: queryKeys.clients.activities(clientId),
    queryFn: () => apiClient.get<ClientActivity[]>(`/clients/${clientId}/activities`),
    enabled: clientId > 0,
  });
}

export function useCreateClientAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ClientAccount>) =>
      apiClient.post<ClientAccount>("/clients", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.all });
    },
  });
}

export function useUpdateClientAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateClientAccountStatusInput) =>
      apiClient.patch<ClientAccount>(`/clients/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.all });
      qc.invalidateQueries({ queryKey: queryKeys.clients.detail(vars.id) });
    },
  });
}

export function useLogClientActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LogClientActivityInput) =>
      apiClient.post<ClientActivity>(
        `/clients/${input.clientAccountId}/activities`,
        input
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.clients.activities(vars.clientAccountId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.clients.detail(vars.clientAccountId),
      });
    },
  });
}

export function useCrmAssignmentStats(enabled = false) {
  return useQuery({
    queryKey: queryKeys.clients.crmStats(),
    queryFn: () => apiClient.get<CrmAssignmentStats>("/clients/assign-crm"),
    enabled,
  });
}

export function useAssignCrmReps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<CrmAssignmentStats>("/clients/assign-crm", {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.all });
      qc.invalidateQueries({ queryKey: queryKeys.clients.crmStats() });
    },
  });
}

export function useRenewalAccounts() {
  return useQuery({
    queryKey: [...queryKeys.clients.all, "renewals"] as const,
    queryFn: () => apiClient.get<ClientAccount[]>("/clients/renewals"),
  });
}

export function useUpdateRenewal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, ...data }: UpdateRenewalInput) =>
      apiClient.patch<ClientAccount>(`/clients/renewals/${accountId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...queryKeys.clients.all, "renewals"] });
    },
  });
}

export function useClientAccountStats() {
  return useQuery({
    queryKey: queryKeys.clientStats.stats(),
    queryFn: () => apiClient.get<ClientAccountStats>("/clients/stats"),
  });
}

export function useClientHealth(params?: { status?: string }) {
  return useQuery({
    queryKey: [...queryKeys.clients.all, "health", params] as const,
    queryFn: () => apiClient.get<{ items: ClientHealth[]; summary: { healthy: number; at_risk: number; critical: number } }>("/clients/health", params as Record<string, unknown>),
  });
}

export function useChurnAlerts() {
  return useQuery({
    queryKey: [...queryKeys.clients.all, "churnAlerts"] as const,
    queryFn: () => apiClient.get<{
      alerts: ClientHealth[];
      summary: { critical: number; atRisk: number; total: number };
    }>("/clients/churn-alerts"),
  });
}

export function useClientTimeline(clientId: number) {
  return useQuery({
    queryKey: [...queryKeys.clients.detail(clientId), "timeline"] as const,
    queryFn: () => apiClient.get<{ events: ClientTimelineEvent[]; total: number }>(`/clients/${clientId}/timeline`),
    enabled: clientId > 0,
  });
}

export function useSimpleClientsList() {
  return useQuery({
    queryKey: ["clients", "simple-list"],
    queryFn: () => apiClient.get<SimpleClient[]>("/clients/list"),
  });
}


export function useClientOpportunities(clientId?: number) {
  return useQuery({
    queryKey: ["client-opportunities", clientId],
    queryFn: () =>
      apiClient.get<ClientOpportunity[]>(
        "/clients/opportunities",
        clientId ? { clientId } : undefined
      ),
  });
}

export function useCreateClientOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClientOpportunityInput) =>
      apiClient.post<ClientOpportunity>("/clients/opportunities", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-opportunities"] }),
  });
}

export function useUpdateClientOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CreateClientOpportunityInput> & { id: number }) =>
      apiClient.patch<ClientOpportunity>(`/clients/opportunities/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-opportunities"] }),
  });
}

export function useDeleteClientOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/clients/opportunities/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-opportunities"] }),
  });
}


export function useOnboardingTemplates() {
  return useQuery({
    queryKey: ["onboarding-templates"],
    queryFn: () => apiClient.get<OnboardingTemplate[]>("/clients/onboarding/templates"),
  });
}

export function useClientOnboardingItems(clientId: number) {
  return useQuery({
    queryKey: ["onboarding-items", clientId],
    queryFn: () => apiClient.get<OnboardingItem[]>("/clients/onboarding/items", { clientId }),
    enabled: clientId > 0,
  });
}

export function useCreateOnboardingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      clientId: number; title: string; description?: string;
      assignedTo?: string; dueDate?: string; templateId?: number;
    }) => apiClient.post<OnboardingItem>("/clients/onboarding/items", input),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["onboarding-items", vars.clientId] }),
  });
}

export function useToggleOnboardingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, completed, clientId: _clientId }: { id: number; completed: boolean; clientId: number }) =>
      apiClient.patch<OnboardingItem>(`/clients/onboarding/items/${id}`, {
        completedAt: completed ? new Date().toISOString() : null,
      }),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["onboarding-items", vars.clientId] }),
  });
}

export function useDeleteOnboardingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, clientId: _clientId }: { id: number; clientId: number }) =>
      apiClient.delete(`/clients/onboarding/items/${id}`),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["onboarding-items", vars.clientId] }),
  });
}

export function useCreateOnboardingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string; isDefault?: boolean }) =>
      apiClient.post<OnboardingTemplate>("/clients/onboarding/templates", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["onboarding-templates"] }),
  });
}


export function useCsatSurveys() {
  return useQuery({
    queryKey: ["csat-surveys"],
    queryFn: () => apiClient.get<CsatSurvey[]>("/csat"),
  });
}

export function useCsatSurveyResponses(surveyId: number) {
  return useQuery({
    queryKey: ["csat-responses", surveyId],
    queryFn: () => apiClient.get<CsatResponse[]>(`/csat/${surveyId}/responses`),
    enabled: surveyId > 0,
  });
}

export function useCreateCsatSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; question?: string; clientId?: number; scaleMax?: number }) =>
      apiClient.post<CsatSurvey>("/csat", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["csat-surveys"] }),
  });
}

export function useUpdateCsatSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; status?: string; title?: string; question?: string }) =>
      apiClient.patch<CsatSurvey>(`/csat/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["csat-surveys"] }),
  });
}

export function useDeleteCsatSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/csat/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["csat-surveys"] }),
  });
}
