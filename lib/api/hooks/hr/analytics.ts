"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface HrAnalyticsData {
  headcount: {
    total: number;
    active: number;
    newThisMonth: number;
  };
  departments: { name: string; count: number }[];
  gender: { gender: string; count: number }[];
  roles: { role: string; count: number }[];
  attendance: { totalLogsThisMonth: number };
  leaves: {
    byStatus: Record<string, number>;
    byMonth: { month: string; count: number }[];
  };
  payroll: { totalCostYTD: string };
  expenses: { approvedYTD: string };
}

export function useHrAnalytics() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "analytics"] as const,
    queryFn: () => apiClient.get<HrAnalyticsData>("/hr/analytics"),
    staleTime: 60_000,
  });
}
