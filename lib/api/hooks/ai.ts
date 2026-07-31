"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  LeadScoreResult, EmailTone, GeneratedEmail, DealPredictionResult,
  NextActionResult, ChurnRiskResult, ConversationSummaryResult, LeadEnrichmentResult,
  CandidateScoreResult, ReviewDraftResult, HelpdeskReplyResult, AttritionRiskResult,
} from "@/lib/ai/prompts";

export function useAIScoreLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leadId: number) =>
      apiClient.post<LeadScoreResult>("/ai/score-lead", { leadId }),
    onSuccess: (_, leadId) => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.detail(leadId) });
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useAIBatchScoreLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leadIds: number[]) =>
      apiClient.post<{ results: Record<number, LeadScoreResult>; scored: number }>(
        "/ai/score-lead",
        { leadIds },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

interface GenerateEmailInput {
  leadName: string;
  company?: string;
  designation?: string;
  dealStage?: string;
  lastActivityType?: string;
  lastActivityDate?: string;
  lastActivityNotes?: string;
  potentialValue?: string;
  tone?: EmailTone;
  context?: string;
  allVariations?: boolean;
}

export function useGenerateEmail() {
  return useMutation({
    mutationFn: (input: GenerateEmailInput) =>
      apiClient.post<GeneratedEmail>("/ai/generate-email", input),
  });
}

export function useGenerateEmailVariations() {
  return useMutation({
    mutationFn: (input: Omit<GenerateEmailInput, "tone">) =>
      apiClient.post<{ variations: Record<EmailTone, GeneratedEmail> }>(
        "/ai/generate-email",
        { ...input, allVariations: true },
      ),
  });
}

export function usePredictDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dealId: number) =>
      apiClient.post<DealPredictionResult>("/ai/predict-deal", { dealId }),
    onSuccess: (_, dealId) => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.detail(dealId) });
      qc.invalidateQueries({ queryKey: queryKeys.deals.all });
    },
  });
}

export function useNextBestAction() {
  return useMutation({
    mutationFn: (leadId: number) =>
      apiClient.post<NextActionResult>("/ai/next-action", { leadId }),
  });
}

export function useAnalyzeChurnRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { clientId: number; openTickets?: number; ticketsLast90Days?: number; daysSinceLastActivity?: number | null }) =>
      apiClient.post<ChurnRiskResult>("/ai/churn-risk", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.all });
    },
  });
}

export function useSummarizeConversation() {
  return useMutation({
    mutationFn: (input: { activityType: string; subject?: string; notes: string; leadName?: string; dealName?: string }) =>
      apiClient.post<ConversationSummaryResult>("/ai/summarize", input),
  });
}

export function useEnrichLead() {
  return useMutation({
    mutationFn: (input: { name: string; company?: string; email?: string; designation?: string; city?: string }) =>
      apiClient.post<LeadEnrichmentResult>("/ai/enrich-lead", input),
  });
}

export function useAIScoreCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { candidateId: number; jobId?: number }) =>
      apiClient.post<CandidateScoreResult>("/ai/score-candidate", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.candidates() });
    },
  });
}

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



export interface ObjectionHandlerInput {
  objection: string;
  dealStage: string;
  productName?: string;
  dealValue?: string;
}

export interface ObjectionHandlerResult {
  counterArguments: string[];
  talkingPoints: string[];
  suggestedResponse: string;
}

export function useObjectionHandler() {
  return useMutation({
    mutationFn: (data: ObjectionHandlerInput) =>
      apiClient.post<ObjectionHandlerResult>("/ai/objection-handler", data),
  });
}



export interface SubjectLinesInput {
  campaignContext: string;
  targetAudience?: string;
  tone?: "professional" | "friendly" | "urgent" | "curiosity";
  count?: number;
}

export interface SubjectLinesResult {
  subjects: string[];
}

export function useGenerateSubjectLines() {
  return useMutation({
    mutationFn: (data: SubjectLinesInput) =>
      apiClient.post<SubjectLinesResult>("/ai/subject-lines", data),
  });
}



export interface ContentBrief {
  title: string;
  outline: string[];
  keyPoints: string[];
  seoKeywords: string[];
  callToAction: string;
  estimatedWordCount: number;
  targetAudienceInsights: string;
}

export function useGenerateContentBrief() {
  return useMutation({
    mutationFn: (data: {
      topic: string;
      targetAudience?: string;
      contentType?: string;
      keywords?: string;
    }) => apiClient.post<ContentBrief>("/ai/content-brief", data),
  });
}



export interface SentimentResult {
  sentiment: "positive" | "neutral" | "negative" | "critical";
  score: number;
  summary: string;
  riskFactors: string[];
  recommendations: string[];
  churnRisk: "low" | "medium" | "high";
}

export function useSentimentAnalysis() {
  return useMutation({
    mutationFn: (data: { text: string; clientName?: string }) =>
      apiClient.post<SentimentResult>("/ai/sentiment-analysis", data),
  });
}



export interface NLSearchLead {
  id: number;
  name: string;
  email: string | null;
  company: string | null;
  status: string;
  priority: string | null;
  source: string | null;
  value: number | null;
  city: string | null;
  assignedTo: string | null;
}

export interface NLSearchResult {
  query: string;
  parsedFilters: Record<string, unknown>;
  leads: NLSearchLead[];
  total: number;
}

export function useNLSearch() {
  return useMutation({
    mutationFn: (query: string) =>
      apiClient.post<NLSearchResult>("/ai/nl-search", { query }),
  });
}



export interface CampaignInsightsResult {
  insights: string;
  generatedAt: string;
}

export function useCampaignInsights() {
  return useMutation({
    mutationFn: (period: string) =>
      apiClient.post<CampaignInsightsResult>("/ai/campaign-insights", { period }),
  });
}



export interface AccountSummaryResult {
  summary: string;
  clientName: string;
  generatedAt: string;
}

export function useAccountSummary() {
  return useMutation({
    mutationFn: (clientId: number) =>
      apiClient.post<AccountSummaryResult>("/ai/account-summary", { clientId }),
  });
}



export interface ReportNarratorResult {
  narrative: string;
  generatedAt: string;
}

export function useReportNarrator() {
  return useMutation({
    mutationFn: (data: { data: string; context?: string }) =>
      apiClient.post<ReportNarratorResult>("/ai/report-narrator", data),
  });
}



export interface MeetingPrepResult {
  brief: string;
  attendeeName: string;
  generatedAt: string;
}

export function useMeetingPrep() {
  return useMutation({
    mutationFn: (data: {
      meetingTitle: string;
      attendeeType: "lead" | "client";
      attendeeId: number;
      scheduledAt: string;
      notes?: string;
    }) => apiClient.post<MeetingPrepResult>("/ai/meeting-prep", data),
  });
}



export interface GenerateJdInput {
  title: string;
  requirements?: string;
  description?: string;
  location?: string;
  type?: string;
  salaryMin?: number;
  salaryMax?: number;
  field?: "description" | "requirements";
}

export function useGenerateJobDescription() {
  return useMutation({
    mutationFn: (input: GenerateJdInput) =>
      apiClient.post<{ description?: string; requirements?: string }>("/ai/generate-jd", input),
  });
}



export interface OrgFeatureFlags {
  aiChat: boolean;
  aiLeadScoring: boolean;
  aiEmailDraft: boolean;
  aiSmartNotifications: boolean;
  aiWeeklyRecap: boolean;
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
