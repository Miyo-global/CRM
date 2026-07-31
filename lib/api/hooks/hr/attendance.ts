"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  AttendanceStatusResult,
  AttendanceLog,
  AttendanceSummaryApiResponse,
  AttendanceSummaryPeriod,
  CheckInInput,
  GetMonthlyAttendanceInput,
  WorkLog,
  UpsertWorkLogInput,
  UpdateWorkLogStatusInput,
  GetWorkLogsInput,
} from "@/types/hr";

export function useHrAttendanceStatus(
  options?: Omit<import("@tanstack/react-query").UseQueryOptions<AttendanceStatusResult, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: queryKeys.hr.attendanceStatus(),
    queryFn: () => apiClient.get<AttendanceStatusResult>("/hr/attendance/status"),
    ...options,
  });
}

export function useHrAttendanceLogs(params?: {
  userId?: string;
  year?: number;
  month?: number;
  startDate?: string;
  endDate?: string;
}) {
  const rangeValid =
    !!params?.startDate &&
    !!params?.endDate &&
    params.startDate <= params.endDate;

  return useQuery({
    queryKey: queryKeys.hr.attendanceLogs(params),
    queryFn: () =>
      apiClient.get<AttendanceLog[]>("/hr/attendance/logs", params as Record<string, unknown>),
    enabled: rangeValid,
  });
}

export function useHrCheckIn(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, CheckInInput>, "mutationFn">
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CheckInInput) =>
      apiClient.post<{ success: boolean }>("/hr/attendance/check-in", data),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.hr.attendanceStatus() });
      const previous = qc.getQueryData<AttendanceStatusResult>(queryKeys.hr.attendanceStatus());
      if (previous) {
        qc.setQueryData<AttendanceStatusResult>(queryKeys.hr.attendanceStatus(), {
          ...previous,
          status: "PRESENT",
        });
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.attendanceStatus() });
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export interface CheckOutResult {
  success: boolean;
  date?: string;
  totalWorkHours?: number;
  shouldLogOvertime?: boolean;
}

export function useHrCheckOut(
  options?: Omit<UseMutationOptions<CheckOutResult, Error, { localDate?: string }>, "mutationFn">
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { localDate?: string }) =>
      apiClient.post<CheckOutResult>("/hr/attendance/check-out", data),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.hr.attendanceStatus() });
      const previous = qc.getQueryData<AttendanceStatusResult>(queryKeys.hr.attendanceStatus());
      if (previous) {
        qc.setQueryData<AttendanceStatusResult>(queryKeys.hr.attendanceStatus(), {
          ...previous,
          status: "CHECKED_OUT",
        });
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.attendanceStatus() });
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export interface LogOvertimeInput {
  localDate?: string;
  note: string;
  proofUrl?: string;
}

export function useHrLogOvertime(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, LogOvertimeInput>, "mutationFn">
) {
  return useMutation({
    mutationFn: (data: LogOvertimeInput) =>
      apiClient.post<{ success: boolean }>("/hr/attendance/overtime-log", data),
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useHrToggleBreak(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, void>, "mutationFn">
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<{ success: boolean }>("/hr/attendance/break"),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.hr.attendanceStatus() });
      const previous = qc.getQueryData<AttendanceStatusResult>(queryKeys.hr.attendanceStatus());
      if (previous) {
        qc.setQueryData<AttendanceStatusResult>(queryKeys.hr.attendanceStatus(), {
          ...previous,
          status: previous.status === "ON_BREAK" ? "PRESENT" : "ON_BREAK",
        });
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.attendanceStatus() });
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useHrMonthlyAttendance(params: GetMonthlyAttendanceInput) {
  return useQuery({
    queryKey: queryKeys.hr.monthlyAttendance(params),
    queryFn: () =>
      apiClient.get<AttendanceLog[]>("/hr/attendance/monthly", params as unknown as Record<string, unknown>),
    enabled: !!params.userId,
  });
}

export function useHrAttendanceSummary(params: {
  userId: string;
  period: AttendanceSummaryPeriod;
  year: number;
  month?: number;
  quarter?: number;
}) {
  const q: Record<string, unknown> = {
    userId: params.userId,
    period: params.period,
    year: params.year,
  };
  if (params.month !== undefined) q.month = params.month;
  if (params.quarter !== undefined) q.quarter = params.quarter;

  return useQuery({
    queryKey: queryKeys.hr.attendanceSummary(params),
    queryFn: () => apiClient.get<AttendanceSummaryApiResponse>("/hr/attendance/summary", q),
    enabled: !!params.userId,
  });
}

export function useAttendanceHeatmap(params: { userId: string; year: number }) {
  return useQuery({
    queryKey: queryKeys.hr.attendanceHeatmap(params),
    queryFn: () =>
      apiClient.get<{
        year: number;
        userId: string;
        heatmap: { date: string; hours: number; sessions: number; intensity: number }[];
        summary: { totalDays: number; totalHours: string; avgHoursPerDay: string; longestStreak: number };
      }>("/hr/attendance/heatmap", params as unknown as Record<string, unknown>),
    enabled: !!params.userId,
  });
}

export interface AttendanceMonitorEntry {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  designation: string | null;
  departmentName: string | null;
  checkIn: string | null;
  checkOut: string | null;
  workHours: string | null;
  status: "PRESENT" | "ON_BREAK" | "CHECKED_OUT" | "ON_LEAVE" | "ABSENT";
}

export function useAttendanceMonitor(date?: string) {
  return useQuery({
    queryKey: queryKeys.hr.attendanceMonitor(date),
    queryFn: () =>
      apiClient.get<AttendanceMonitorEntry[]>("/hr/attendance/monitor", date ? { date } : {}),
  });
}

export function useGetWorkLogs(input: GetWorkLogsInput) {
  const params: Record<string, unknown> = {
    year: input.year,
    quarter: input.quarter,
  };
  if (input.userId) params.userId = input.userId;
  if (input.departmentId) params.departmentId = input.departmentId;
  if (input.month != null) params.month = input.month;
  if (input.dateFrom) params.dateFrom = input.dateFrom;
  if (input.dateTo) params.dateTo = input.dateTo;

  return useQuery({
    queryKey: queryKeys.hr.workLogs(params),
    queryFn: () => apiClient.get<WorkLog[]>("/hr/work-logs", params),
  });
}

export function useUpsertWorkLog(
  options?: Omit<UseMutationOptions<WorkLog, Error, UpsertWorkLogInput>, "mutationFn">
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertWorkLogInput) =>
      apiClient.post<WorkLog>("/hr/work-logs", data),
    ...options,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.all });
      options?.onSuccess?.(...args);
    },
    onError: options?.onError,
  });
}

export function useUpdateWorkLogStatus(
  options?: Omit<UseMutationOptions<WorkLog, Error, UpdateWorkLogStatusInput>, "mutationFn">
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateWorkLogStatusInput) =>
      apiClient.patch<WorkLog>("/hr/work-logs/status", data),
    ...options,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.all });
      options?.onSuccess?.(...args);
    },
    onError: options?.onError,
  });
}
