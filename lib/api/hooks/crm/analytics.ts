"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  SalesDashboard,
  MarketingDashboard,
  SupportDashboard,
  CustomerExecutiveDashboard,
} from "@/types/crm";


export function useSalesDashboard() {
  return useQuery({
    queryKey: queryKeys.crm.salesDashboard(),
    queryFn: () => apiClient.get<SalesDashboard>("/crm/sales-dashboard"),
  });
}

export function useMarketingDashboard() {
  return useQuery({
    queryKey: queryKeys.crm.marketingDashboard(),
    queryFn: () => apiClient.get<MarketingDashboard>("/crm/marketing-dashboard"),
  });
}

export function useSupportDashboard() {
  return useQuery({
    queryKey: queryKeys.crm.supportDashboard(),
    queryFn: () => apiClient.get<SupportDashboard>("/crm/support-dashboard"),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });
}

export function useCustomerExecutiveDashboard() {
  return useQuery({
    queryKey: queryKeys.crm.customerExecutiveDashboard(),
    queryFn: () => apiClient.get<CustomerExecutiveDashboard>("/crm/customer-executive"),
  });
}


export interface SalesDashboardFilters {
  from?: string;
  to?: string;
  repId?: number;
}

export interface SalesDashboardKPIsResult {
  totalRevenue: number;
  pipelineValue: number;
  closeRate: number;
  avgDealSize: number;
  dealsWon: number;
  totalDeals: number;
  prevRevenue: number;
  prevCloseRate: number;
  prevAvgDealSize: number;
}

export interface SalesFunnelStageResult {
  stage: string;
  count: number;
  value: number;
  color: string;
  dropOffPct: number | null;
}

export interface SalesLeaderboardEntryResult {
  repId: number;
  name: string;
  initials: string;
  dealsWon: number;
  totalDeals: number;
  revenue: number;
  winRate: number;
}

export interface RevenueVsGoalEntryResult {
  month: string;
  actual: number;
  target: number;
}

export function useSalesDashboardKPIs(filters: SalesDashboardFilters = {}) {
  const params: Record<string, unknown> = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.repId) params.repId = String(filters.repId);

  return useQuery({
    queryKey: queryKeys.crm.salesKpis(params),
    queryFn: () => apiClient.get<SalesDashboardKPIsResult>("/sales/dashboard/kpis", params),
  });
}

export function useSalesDashboardFunnel(filters: Omit<SalesDashboardFilters, "repId"> & { repId?: number } = {}) {
  const params: Record<string, unknown> = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.repId) params.repId = String(filters.repId);

  return useQuery({
    queryKey: queryKeys.crm.salesFunnel(params),
    queryFn: () => apiClient.get<SalesFunnelStageResult[]>("/sales/dashboard/funnel", params),
  });
}

export function useSalesDashboardLeaderboard(filters: Pick<SalesDashboardFilters, "from" | "to"> = {}) {
  const params: Record<string, unknown> = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;

  return useQuery({
    queryKey: queryKeys.crm.salesLeaderboard(params),
    queryFn: () => apiClient.get<SalesLeaderboardEntryResult[]>("/sales/dashboard/leaderboard", params),
  });
}

export function useRevenueVsGoal(year?: number) {
  const y = year ?? new Date().getFullYear();
  return useQuery({
    queryKey: queryKeys.crm.revenueVsGoal(y),
    queryFn: () => apiClient.get<RevenueVsGoalEntryResult[]>("/sales/dashboard/revenue-vs-goal", { year: String(y) }),
  });
}

export interface DealVelocityResult {
  avgDaysToClose: number;
  medianDaysToClose: number;
  fastestCloseDays: number;
  slowestCloseDays: number;
  dealCount: number;
}

export interface AgingDealResult {
  id: number;
  companyName: string;
  stage: string;
  value: number;
  daysSinceUpdate: number;
  salesRepId: number | null;
}

export function useDealVelocity(filters: Pick<SalesDashboardFilters, "from" | "to"> = {}) {
  const params: Record<string, unknown> = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;

  return useQuery({
    queryKey: ["sales", "velocity", params],
    queryFn: () => apiClient.get<DealVelocityResult>("/sales/dashboard/velocity", params),
  });
}

export function useAgingDeals(thresholdDays = 14) {
  return useQuery({
    queryKey: ["sales", "aging", thresholdDays],
    queryFn: () => apiClient.get<AgingDealResult[]>("/sales/dashboard/aging", { threshold: String(thresholdDays) }),
    staleTime: 5 * 60 * 1000,
  });
}


export interface CycleLengthResult {
  avgDays: number | null;
  medianDays: number | null;
  minDays: number | null;
  maxDays: number | null;
  histogram: { label: string; count: number }[];
  totalDeals: number;
}

export function useSalesCycleLength(repId?: string) {
  const params: Record<string, string> = {};
  if (repId) params.repId = repId;
  return useQuery({
    queryKey: ["sales", "cycleLength", repId],
    queryFn: () => apiClient.get<CycleLengthResult>("/sales/dashboard/cycle-length", params),
    staleTime: 5 * 60 * 1000,
  });
}


export interface LostAnalysisResult {
  total: number;
  totalValue: number;
  reasons: { reason: string; count: number; totalValue: number; pct: number }[];
}

export function useLostDealAnalysis(repId?: string) {
  const params: Record<string, string> = {};
  if (repId) params.repId = repId;
  return useQuery({
    queryKey: ["sales", "lostAnalysis", repId],
    queryFn: () => apiClient.get<LostAnalysisResult>("/sales/dashboard/lost-analysis", params),
    staleTime: 5 * 60 * 1000,
  });
}


export interface CohortRow {
  cohortMonth: string;
  created: number;
  converted: number;
  conversionRate: number;
  avgDaysToConvert: number | null;
}

export function useSalesCohort(months = 6) {
  return useQuery({
    queryKey: ["sales", "cohort", months],
    queryFn: () => apiClient.get<CohortRow[]>("/sales/dashboard/cohort", { months: String(months) }),
    staleTime: 5 * 60 * 1000,
  });
}


export interface RepMonthStat {
  month: string;
  dealsWon: number;
  revenue: number;
}

export interface RepComparisonData {
  repId: number;
  name: string;
  initials: string;
  dealsWon: number;
  totalDeals: number;
  revenue: number;
  winRate: number;
  avgDealSize: number;
  monthly: RepMonthStat[];
}

export function useRepComparison(rep1Id: number | null, rep2Id: number | null) {
  return useQuery({
    queryKey: ["sales", "repComparison", rep1Id, rep2Id],
    queryFn: () =>
      apiClient.get<{ rep1: RepComparisonData; rep2: RepComparisonData }>(
        "/sales/dashboard/rep-comparison",
        { rep1: String(rep1Id), rep2: String(rep2Id) },
      ),
    enabled: !!rep1Id && !!rep2Id,
    staleTime: 5 * 60 * 1000,
  });
}


export interface SlaByPriority {
  priority: string;
  total: number;
  withinSla: number;
  breached: number;
  avgResolutionHours: number;
  slaTarget: number;
}

export interface SlaRecentBreach {
  id: number;
  title: string;
  priority: string;
  status: string;
  createdAt: string;
  hoursOpen: number;
  slaTarget: number;
}

export interface SlaStats {
  stats: {
    totalTickets: number;
    withinSla: number;
    slaBreached: number;
    complianceRate: number;
    avgResolutionHours: number;
  };
  byPriority: SlaByPriority[];
  recentBreaches: SlaRecentBreach[];
}

export function useSlaCompliance() {
  return useQuery({
    queryKey: ["sla", "compliance"],
    queryFn: () => apiClient.get<SlaStats>("/customer-executive/sla"),
    staleTime: 5 * 60 * 1000,
  });
}


export interface LeadSourceStat {
  source: string;
  count: number;
  converted: number;
  conversionRate: number;
  totalValue: number;
}

export interface LeadSourceReport {
  sources: LeadSourceStat[];
  total: number;
}

export function useLeadSourceReport() {
  return useQuery({
    queryKey: ["leads", "source-report"],
    queryFn: () => apiClient.get<LeadSourceReport>("/leads/source-report"),
  });
}
