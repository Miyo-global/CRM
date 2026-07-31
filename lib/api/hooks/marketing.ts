"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";


export interface AbTest {
  id: number;
  orgId: string;
  name: string;
  description: string | null;
  status: "draft" | "running" | "completed" | "paused";
  variantASubject: string;
  variantBSubject: string;
  variantABody: string | null;
  variantBBody: string | null;
  splitPercent: number;
  audienceSize: number;
  variantASent: number;
  variantBSent: number;
  variantAOpens: number;
  variantBOpens: number;
  variantAClicks: number;
  variantBClicks: number;
  winnerVariant: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAbTestInput {
  name: string;
  description?: string;
  variantASubject: string;
  variantBSubject: string;
  variantABody?: string;
  variantBBody?: string;
  splitPercent?: number;
  audienceSize?: number;
}

export interface UpdateAbTestInput {
  id: number;
  name?: string;
  description?: string;
  status?: "draft" | "running" | "completed" | "paused";
  variantASubject?: string;
  variantBSubject?: string;
  variantABody?: string;
  variantBBody?: string;
  splitPercent?: number;
  audienceSize?: number;
  variantAOpens?: number;
  variantBOpens?: number;
  variantAClicks?: number;
  variantBClicks?: number;
  winnerVariant?: "A" | "B" | null;
  startedAt?: string;
  endedAt?: string;
}


export function useAbTests() {
  return useQuery<{ tests: AbTest[] }>({
    queryKey: queryKeys.abTests.list(),
    queryFn: () => apiClient.get<{ tests: AbTest[] }>("/marketing/ab-tests"),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateAbTest() {
  const queryClient = useQueryClient();
  return useMutation<AbTest, Error, CreateAbTestInput>({
    mutationFn: (data) => apiClient.post<AbTest>("/marketing/ab-tests", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.abTests.all });
    },
  });
}

export function useUpdateAbTest() {
  const queryClient = useQueryClient();
  return useMutation<AbTest, Error, UpdateAbTestInput>({
    mutationFn: ({ id, ...data }) =>
      apiClient.patch<AbTest>(`/marketing/ab-tests/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.abTests.all });
    },
  });
}

export function useDeleteAbTest() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (id) =>
      apiClient.delete<{ success: boolean }>(`/marketing/ab-tests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.abTests.all });
    },
  });
}


export interface LandingPage {
  id: number;
  name: string;
  url: string;
  description: string | null;
  isActive: boolean;
  totalViews: number;
  todayViews: number;
  weekViews: number;
  createdAt: string;
}

export interface LandingPageDetail extends LandingPage {
  viewsByDay: { date: string; views: number }[];
  deviceBreakdown: { device: string; count: number }[];
  referrerBreakdown: { referrer: string; count: number }[];
}

interface LandingPagesResponse {
  pages: LandingPage[];
}

interface LandingPageDetailResponse {
  page: LandingPageDetail;
  viewsByDay: { date: string; views: number }[];
  deviceBreakdown: { device: string; count: number }[];
  referrerBreakdown: { referrer: string; count: number }[];
}

interface CreateLandingPageInput {
  name: string;
  url: string;
  description?: string;
}

interface UpdateLandingPageInput {
  id: number;
  name?: string;
  url?: string;
  description?: string;
  isActive?: boolean;
}

export function useLandingPages() {
  return useQuery<LandingPagesResponse>({
    queryKey: queryKeys.landingPages.list(),
    queryFn: () => apiClient.get<LandingPagesResponse>("/marketing/landing-pages"),
    staleTime: 2 * 60 * 1000,
  });
}

export function useLandingPageDetail(pageId: number | null) {
  return useQuery<LandingPageDetailResponse>({
    queryKey: queryKeys.landingPages.detail(pageId ?? 0),
    queryFn: () =>
      apiClient.get<LandingPageDetailResponse>(`/marketing/landing-pages/${pageId}`),
    enabled: pageId !== null,
    staleTime: 60 * 1000,
  });
}

export function useCreateLandingPage() {
  const queryClient = useQueryClient();
  return useMutation<LandingPage, Error, CreateLandingPageInput>({
    mutationFn: (data) =>
      apiClient.post<LandingPage>("/marketing/landing-pages", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.landingPages.list() });
    },
  });
}

export function useUpdateLandingPage() {
  const queryClient = useQueryClient();
  return useMutation<LandingPage, Error, UpdateLandingPageInput>({
    mutationFn: ({ id, ...data }) =>
      apiClient.patch<LandingPage>(`/marketing/landing-pages/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.landingPages.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.landingPages.detail(id) });
    },
  });
}

export function useDeleteLandingPage() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (id) =>
      apiClient.delete<{ success: boolean }>(`/marketing/landing-pages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.landingPages.all });
    },
  });
}


export interface CrmPageTestimonial {
  id: string;
  name: string;
  role?: string;
  text: string;
  avatar?: string;
  rating?: number;
}

export interface CrmPageSettings {
  testimonials?: CrmPageTestimonial[];
  trustBadges?: string[];
  showTrustSection?: boolean;
}

export interface CrmPage {
  id: number;
  orgId: string;
  name: string;
  slug: string | null;
  title: string | null;
  description: string | null;
  content: string | null;
  isPublished: boolean | null;
  isActive: boolean | null;
  settings: CrmPageSettings | null;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCrmPageInput {
  slug: string;
  title: string;
  description?: string;
  content?: string;
  isPublished?: boolean;
}

export interface UpdateCrmPageInput {
  id: number;
  slug?: string;
  title?: string;
  description?: string | null;
  content?: string | null;
  isPublished?: boolean;
  name?: string;
  settings?: CrmPageSettings | null;
}

export interface CrmPageAnalytics {
  pageId: number;
  title: string | null;
  slug: string | null;
  period: { days: number; since: string };
  summary: { totalViews: number; totalLeads: number; conversionRate: number };
  dailyViews: { date: string; views: number }[];
  deviceBreakdown: { type: string; count: number }[];
  utmSourceBreakdown: { source: string; count: number }[];
}

export function useCrmPages() {
  return useQuery<CrmPage[]>({
    queryKey: queryKeys.crmPages.list(),
    queryFn: () => apiClient.get<CrmPage[]>("/landing/pages"),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCrmPage(id: number | null) {
  return useQuery<CrmPage>({
    queryKey: queryKeys.crmPages.detail(id ?? 0),
    queryFn: () => apiClient.get<CrmPage>(`/landing/pages/${id}`),
    enabled: id !== null && id > 0,
    staleTime: 60 * 1000,
  });
}

export function useCrmPageAnalytics(id: number | null, days = 30) {
  return useQuery<CrmPageAnalytics>({
    queryKey: queryKeys.crmPages.analytics(id ?? 0, days),
    queryFn: () =>
      apiClient.get<CrmPageAnalytics>(`/landing/pages/${id}/analytics?days=${days}`),
    enabled: id !== null && id > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCrmPage() {
  const qc = useQueryClient();
  return useMutation<CrmPage, Error, CreateCrmPageInput>({
    mutationFn: (data) => apiClient.post<CrmPage>("/landing/pages", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.crmPages.list() });
    },
  });
}

export function useUpdateCrmPage() {
  const qc = useQueryClient();
  return useMutation<CrmPage, Error, UpdateCrmPageInput>({
    mutationFn: ({ id, ...data }) =>
      apiClient.put<CrmPage>(`/landing/pages/${id}`, data),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.crmPages.list() });
      void qc.invalidateQueries({ queryKey: queryKeys.crmPages.detail(id) });
    },
  });
}

export function useDeleteCrmPage() {
  const qc = useQueryClient();
  return useMutation<{ id: number; archived: boolean }, Error, number>({
    mutationFn: (id) =>
      apiClient.delete<{ id: number; archived: boolean }>(`/landing/pages/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.crmPages.all });
    },
  });
}


export interface SocialMetric {
  id: number;
  platform: string;
  metricDate: string;
  followers: number;
  impressions: number;
  engagements: number;
  clicks: number;
  shares: number;
  comments: number;
  reach: number;
  createdAt: string;
}

export interface SocialSummary {
  avgEngagement: number;
  totalImpressions: number;
  totalClicks: number;
  followerGrowth: number;
}

interface SocialMetricsResponse {
  metrics: SocialMetric[];
  summary: SocialSummary;
}

export interface RecordSocialMetricsInput {
  platform: string;
  metricDate: string;
  followers: number;
  impressions?: number;
  engagements?: number;
  clicks?: number;
  shares?: number;
  comments?: number;
  reach?: number;
}

export function useSocialMetrics(platform?: string, period?: number) {
  return useQuery<SocialMetricsResponse>({
    queryKey: queryKeys.socialMetrics.list({ platform, period }),
    queryFn: () => {
      const params = new URLSearchParams();
      if (platform) params.set("platform", platform);
      if (period) params.set("period", String(period));
      const qs = params.toString();
      return apiClient.get<SocialMetricsResponse>(`/marketing/social-metrics${qs ? `?${qs}` : ""}`);
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useRecordSocialMetrics() {
  const queryClient = useQueryClient();
  return useMutation<SocialMetric, Error, RecordSocialMetricsInput>({
    mutationFn: (data) => apiClient.post<SocialMetric>("/marketing/social-metrics", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.socialMetrics.all });
    },
  });
}

export function useDeleteSocialMetric() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (id) =>
      apiClient.delete<{ success: boolean }>(`/marketing/social-metrics/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.socialMetrics.all });
    },
  });
}


export interface ContentCalendarItem {
  id: number;
  orgId: string;
  title: string;
  contentType: string;
  channel: string | null;
  status: string;
  scheduledDate: string | null;
  publishedDate: string | null;
  assignedTo: string | null;
  description: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateContentItemInput {
  title: string;
  contentType?: string;
  channel?: string | null;
  status?: string;
  scheduledDate?: string | null;
  assignedTo?: string | null;
  description?: string | null;
  tags?: string[];
}

export interface UpdateContentItemInput extends Partial<CreateContentItemInput> {
  id: number;
  publishedDate?: string | null;
}

export function useContentCalendar(month?: string) {
  return useQuery({
    queryKey: queryKeys.contentCalendar.list(month),
    queryFn: () => {
      const params = month ? { month } : undefined;
      return apiClient.get<ContentCalendarItem[]>(
        "/marketing/content-calendar",
        params as Record<string, string> | undefined
      );
    },
  });
}

export function useCreateContentItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateContentItemInput) =>
      apiClient.post<ContentCalendarItem>("/marketing/content-calendar", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.contentCalendar.all });
    },
  });
}

export function useUpdateContentItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateContentItemInput) =>
      apiClient.patch<ContentCalendarItem>(`/marketing/content-calendar/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.contentCalendar.all });
    },
  });
}

export function useDeleteContentItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/marketing/content-calendar/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.contentCalendar.all });
    },
  });
}
