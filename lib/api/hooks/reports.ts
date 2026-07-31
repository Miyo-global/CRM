"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  AttendanceReport,
  PayrollReport,
  ProjectReport,
  TeamPerformanceReport,
} from "@/types/reports";

export const useAttendanceReport = (
  userId?: string,
  startDate?: Date,
  endDate?: Date,
  options?: Omit<
    UseQueryOptions<AttendanceReport, Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) => {
  return useQuery<AttendanceReport, Error>({
    queryKey: queryKeys.reports.attendance({ userId, startDate, endDate }),
    queryFn: () =>
      apiClient.get<AttendanceReport>("/reports/attendance", {
        ...(userId ? { userId } : {}),
        startDate: startDate!.toISOString(),
        endDate: endDate!.toISOString(),
      }),
    enabled: !!startDate && !!endDate,
    ...options,
  });
};

export const usePayrollReport = (
  userId?: string,
  startMonth?: string,
  endMonth?: string,
  options?: Omit<
    UseQueryOptions<PayrollReport, Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) => {
  return useQuery<PayrollReport, Error>({
    queryKey: queryKeys.reports.payroll({ userId, startMonth, endMonth }),
    queryFn: () =>
      apiClient.get<PayrollReport>("/reports/payroll", {
        ...(userId ? { userId } : {}),
        startMonth: startMonth!,
        endMonth: endMonth!,
      }),
    enabled: !!startMonth && !!endMonth,
    ...options,
  });
};

export const useProjectReport = (
  projectId?: number,
  startDate?: Date,
  endDate?: Date,
  options?: Omit<
    UseQueryOptions<ProjectReport, Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<ProjectReport, Error>({
    queryKey: queryKeys.reports.project({ projectId, startDate, endDate }),
    queryFn: () =>
      apiClient.get<ProjectReport>("/reports/project", {
        ...(projectId ? { projectId: String(projectId) } : {}),
        ...(startDate ? { startDate: startDate.toISOString() } : {}),
        ...(endDate ? { endDate: endDate.toISOString() } : {}),
      }),
    ...options,
  });
};

export const useTeamPerformanceReport = (
  startDate?: Date,
  endDate?: Date,
  options?: Omit<
    UseQueryOptions<TeamPerformanceReport[], Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) => {
  return useQuery<TeamPerformanceReport[], Error>({
    queryKey: queryKeys.reports.teamPerformance({ startDate, endDate }),
    queryFn: () =>
      apiClient.get<TeamPerformanceReport[]>("/reports/team-performance", {
        startDate: startDate!.toISOString(),
        endDate: endDate!.toISOString(),
      }),
    enabled: !!startDate && !!endDate,
    ...options,
  });
};
