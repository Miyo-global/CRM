"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface MarketingCampaign {
  id: number;
  orgId: string;
  name: string;
  status: "active" | "paused" | "completed";
  channel: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  targetAudience: string | null;
  leads: number;
  spend: string;
  roi: string;
  budgetAllocated: string | null;
  budgetSpent: string | null;
  ownerId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface EmailCampaign {
  id: number;
  name: string;
  subject: string;
  body: string;
  status: string;
  recipientFilter: Record<string, unknown> | null;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  openCount: number;
  clickCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string | null;
}

export interface CampaignLead {
  id: number;
  name: string;
  email: string | null;
  company: string | null;
  status: string;
  source: string | null;
}

export interface CampaignLeadsResponse {
  leads: CampaignLead[];
  total: number;
}

export interface CampaignLeadFilters {
  status?: string;
  source?: string;
  q?: string;
}

export function useMarketingCampaigns(params?: { status?: string }) {
  return useQuery({
    queryKey: queryKeys.marketingCampaigns.list(params as Record<string, unknown>),
    queryFn: () => apiClient.get<MarketingCampaign[]>("/marketing/campaigns", params as Record<string, unknown>),
  });
}

export function useMarketingCampaignDetail(id: number) {
  return useQuery({
    queryKey: queryKeys.marketingCampaigns.detail(id),
    queryFn: () => apiClient.get<MarketingCampaign>(`/marketing/campaigns/${id}`),
    enabled: id > 0,
  });
}

export function useCreateMarketingCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; status?: string; channel?: string; description?: string; startDate?: string; endDate?: string; targetAudience?: string; budgetAllocated?: string }) =>
      apiClient.post<MarketingCampaign>("/marketing/campaigns", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.marketingCampaigns.all });
      qc.invalidateQueries({ queryKey: queryKeys.crm.marketingDashboard() });
    },
  });
}

export function useUpdateMarketingCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<{ name: string; status: string; channel: string; description: string; startDate: string; endDate: string; targetAudience: string; budgetAllocated: string; budgetSpent: string }>) =>
      apiClient.patch<MarketingCampaign>(`/marketing/campaigns/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.marketingCampaigns.all });
      qc.invalidateQueries({ queryKey: queryKeys.marketingCampaigns.detail(vars.id) });
      qc.invalidateQueries({ queryKey: queryKeys.crm.marketingDashboard() });
    },
  });
}

export function useDeleteMarketingCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/marketing/campaigns/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.marketingCampaigns.all });
      qc.invalidateQueries({ queryKey: queryKeys.crm.marketingDashboard() });
    },
  });
}

export function useEmailCampaigns(params?: { status?: string }) {
  return useQuery({
    queryKey: [...queryKeys.marketingCampaigns.all, "email", params] as const,
    queryFn: () => apiClient.get<EmailCampaign[]>("/marketing/email-campaigns", params as Record<string, unknown>),
  });
}

export function useCreateEmailCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; subject: string; body: string; templateId?: number; recipientFilter?: Record<string, unknown>; scheduledAt?: string }) =>
      apiClient.post<EmailCampaign>("/marketing/email-campaigns", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.marketingCampaigns.all }),
  });
}

export function useUpdateEmailCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<{ name: string; subject: string; body: string; status: string }>) =>
      apiClient.patch<EmailCampaign>(`/marketing/email-campaigns/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.marketingCampaigns.all }),
  });
}

export function useSendEmailCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (campaignId: number) =>
      apiClient.post<{ sent: number; campaignId: number; status: string }>(`/marketing/email-campaigns/${campaignId}/send`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.marketingCampaigns.all }),
  });
}

export function useDeleteEmailCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/marketing/email-campaigns/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.marketingCampaigns.all }),
  });
}

export function useCampaignLeads(filters: CampaignLeadFilters) {
  return useQuery({
    queryKey: [...queryKeys.marketingCampaigns.all, "campaignLeads", filters] as const,
    queryFn: () => apiClient.get<CampaignLeadsResponse>("/marketing/campaigns/leads", filters as Record<string, unknown>),
  });
}

export function useBulkSendCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, leadIds }: { campaignId: number; leadIds: number[] }) =>
      apiClient.post<{ sent: number; campaignId: number }>(`/marketing/email-campaigns/${campaignId}/bulk-send`, { leadIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.marketingCampaigns.all }),
  });
}

export function useGenerateUtmLink() {
  return useMutation({
    mutationFn: (input: { baseUrl: string; source: string; medium: string; campaign: string; term?: string; content?: string }) =>
      apiClient.post<{ url: string; params: Record<string, string | undefined> }>("/marketing/utm", input),
  });
}

export function useUtmAttribution(params?: { source?: string }) {
  return useQuery({
    queryKey: [...queryKeys.marketingCampaigns.all, "utmAttribution", params] as const,
    queryFn: () => apiClient.get<{ attribution: Array<{ source: string | null; count: number; totalValue: number }> }>("/marketing/utm", params as Record<string, unknown>),
  });
}
