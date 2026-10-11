"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { SupportDashboard } from "@/types/crm";

export function useSupportDashboard() {
  return useQuery({
    queryKey: queryKeys.crm.supportDashboard(),
    queryFn: () => apiClient.get<SupportDashboard>("/crm/support-dashboard"),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
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

export interface CycleLengthResult {
  avgDays: number | null;
  medianDays: number | null;
  minDays: number | null;
  maxDays: number | null;
  histogram: { label: string; count: number }[];
  totalDeals: number;
}

export interface LostAnalysisResult {
  total: number;
  totalValue: number;
  reasons: { reason: string; count: number; totalValue: number; pct: number }[];
}

export interface CohortRow {
  cohortMonth: string;
  created: number;
  converted: number;
  conversionRate: number;
  avgDaysToConvert: number | null;
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
