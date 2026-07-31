"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface AnalyticsFilters {
  from?: string;
  to?: string;
  department?: string;
}

function toParams(filters: AnalyticsFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (filters.from) p.from = filters.from;
  if (filters.to) p.to = filters.to;
  if (filters.department && filters.department !== "all") p.department = filters.department;
  return p;
}

export interface RecruitmentAnalyticsData {
  openPositions: number;
  totalOpenings: number;
  jobsByStatus: { status: string; count: number }[];
  pipelineByStage: { stage: string; count: number }[];
  offersReleased: number;
  offersAccepted: number;
  offerAcceptanceRate: number | null;
  hiredCount: number;
  avgTimeToHireDays: number | null;
  sourceOfHire: { source: string; count: number }[];
}

export interface RetentionAnalyticsData {
  activeHeadcount: number;
  voluntaryExits: number;
  involuntaryExits: number;
  totalExits: number;
  attritionRate: number;
  exitTrend: { month: string; voluntary: number; involuntary: number }[];
  attritionByDept: { department: string; count: number }[];
}

export interface PerformanceAnalyticsData {
  reviews: { total: number; completed: number; completionRate: number | null } | null;
  appraisals: { total: number; closed: number; completionRate: number | null } | null;
  goals: { total: number; completed: number; completionRate: number | null } | null;
  ratingDistribution: { band: string; count: number }[];
}

export interface ExecutiveKpisData {
  headcount: number;
  attritionRate: number;
  hiringRate: number;
  avgTenureMonths: number | null;
  diversityRatio: number | null;
  openPositions: number;
  orgHealthScore: number;
}

const ANALYTICS_KEY = ["miyoglobal", "hr", "analytics"] as const;

export function useRecruitmentAnalytics(filters: AnalyticsFilters) {
  const params = toParams(filters);
  return useQuery({
    queryKey: [...ANALYTICS_KEY, "recruitment", params] as const,
    queryFn: () => apiClient.get<RecruitmentAnalyticsData>("/hr/analytics/recruitment", params),
    staleTime: 60_000,
  });
}

export function useRetentionAnalytics(filters: AnalyticsFilters) {
  const params = toParams(filters);
  return useQuery({
    queryKey: [...ANALYTICS_KEY, "retention", params] as const,
    queryFn: () => apiClient.get<RetentionAnalyticsData>("/hr/analytics/retention", params),
    staleTime: 60_000,
  });
}

export function usePerformanceAnalytics(filters: AnalyticsFilters) {
  const params = toParams(filters);
  return useQuery({
    queryKey: [...ANALYTICS_KEY, "performance", params] as const,
    queryFn: () => apiClient.get<PerformanceAnalyticsData>("/hr/analytics/performance", params),
    staleTime: 60_000,
  });
}

export function useExecutiveKpis(filters: AnalyticsFilters) {
  const params = toParams(filters);
  return useQuery({
    queryKey: [...ANALYTICS_KEY, "executive", params] as const,
    queryFn: () => apiClient.get<ExecutiveKpisData>("/hr/analytics/executive", params),
    staleTime: 60_000,
  });
}

export interface WorkforceTrendsData {
  currentHeadcount: number;
  monthly: { month: string; joiners: number; exits: number }[];
}

export interface AttendanceAnalyticsData {
  year: number;
  month: number;
  totalAttendanceLogs: number;
  byDepartment: { department: string; count: number }[];
  daily: { date: string; count: number }[];
}

export interface CompensationAnalyticsData {
  overall: { avgSalary: string; minSalary: string; maxSalary: string; medianSalary: string };
  byDepartment: { department: string; avgSalary: string; count: number }[];
  byRole: { role: string; avgSalary: string; count: number }[];
}

export interface LeaveAnalyticsData {
  year: number;
  byDepartment: { department: string; total: number; approved: number; pending: number; rejected: number }[];
  monthlyTrend: { month: string; count: number }[];
}

export interface DiversityData {
  total: number;
  gender: { label: string; count: number; pct: number }[];
  ageBuckets: { label: string; count: number }[];
  tenureBuckets: { label: string; count: number }[];
}

export function useWorkforceTrends(filters: AnalyticsFilters) {
  const params = toParams(filters);
  return useQuery({
    queryKey: [...ANALYTICS_KEY, "workforce-trends", params] as const,
    queryFn: () => apiClient.get<WorkforceTrendsData>("/hr/analytics/workforce-trends", params),
    staleTime: 60_000,
  });
}

export function useAttendanceAnalytics(year: number, month: number) {
  return useQuery({
    queryKey: [...ANALYTICS_KEY, "attendance", year, month] as const,
    queryFn: () =>
      apiClient.get<AttendanceAnalyticsData>("/hr/analytics/attendance", {
        year: String(year),
        month: String(month),
      }),
    staleTime: 60_000,
  });
}

export function useCompensationAnalytics() {
  return useQuery({
    queryKey: [...ANALYTICS_KEY, "compensation"] as const,
    queryFn: () => apiClient.get<CompensationAnalyticsData>("/hr/analytics/compensation"),
    staleTime: 60_000,
  });
}

export function useLeaveAnalytics(year: number) {
  return useQuery({
    queryKey: [...ANALYTICS_KEY, "leave-analytics", year] as const,
    queryFn: () =>
      apiClient.get<LeaveAnalyticsData>("/hr/leaves/analytics", { year: String(year) }),
    staleTime: 60_000,
  });
}

export function useDiversityAnalytics() {
  return useQuery({
    queryKey: [...ANALYTICS_KEY, "diversity"] as const,
    queryFn: () => apiClient.get<DiversityData>("/hr/analytics/diversity"),
    staleTime: 60_000,
  });
}
