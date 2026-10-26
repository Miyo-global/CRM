"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { ReviewDraftResult, HelpdeskReplyResult, AttritionRiskResult } from "@/lib/ai/prompts";

export function useAIGenerateReview() {
  return useMutation({
    mutationFn: (input: { userId: string; periodStart: string; periodEnd: string }) =>
      apiClient.post<ReviewDraftResult>("/ai/generate-review", input),
  });
}

export function useAISuggestHelpdeskReply() {
  return useMutation({
    mutationFn: (ticketId: number) =>
      apiClient.post<HelpdeskReplyResult>("/ai/helpdesk-reply", { ticketId }),
  });
}

export function useAIAttritionRisk() {
  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.post<AttritionRiskResult>("/ai/attrition-risk", { userId }),
  });
}

export interface OrgFeatureFlags {
  aiChat: boolean;
  aiLeadScoring: boolean;
  aiEmailDraft: boolean;
  aiSmartNotifications: boolean;
  aiWeeklyRecap: boolean;
  clientPortal: boolean;
  /** An AI provider key is configured; AI routes 403 without one. */
  aiConfigured?: boolean;
}

export function useOrgFeatureFlags() {
  return useQuery({
    queryKey: ["settings", "feature-flags"],
    queryFn: () => apiClient.get<OrgFeatureFlags>("/settings/feature-flags"),
  });
}

export function useUpdateFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { flag: keyof OrgFeatureFlags; enabled: boolean }) =>
      apiClient.patch<{ success: boolean; flag: string; enabled: boolean }>(
        "/settings/feature-flags",
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "feature-flags"] });
    },
  });
}

interface AiUsageTotals {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: string;
  requestCount: number;
}

interface AiUsageByFeature {
  feature: string;
  model: string;
  totalTokens: number;
  estimatedCostUsd: string;
  requestCount: number;
}

interface AiUsageDaily {
  date: string;
  totalTokens: number;
  estimatedCostUsd: string;
  requestCount: number;
}

export interface AiUsageData {
  totals: AiUsageTotals;
  byFeature: AiUsageByFeature[];
  daily: AiUsageDaily[];
}

export function useAiUsage() {
  return useQuery({
    queryKey: ["settings", "ai-usage"],
    queryFn: () => apiClient.get<AiUsageData>("/settings/ai-usage"),
  });
}
