"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  TimeEntry,
  TimeEntryWithUser,
  TimeEntryFilters,
  LogTimeInput,
  UpdateTimeEntryInput,
} from "@/types/projects";

export function useTimeEntries(
  filters?: TimeEntryFilters,
  options?: Omit<UseQueryOptions<TimeEntryWithUser[]>, "queryKey" | "queryFn">
) {
  return useQuery<TimeEntryWithUser[]>({
    queryKey: queryKeys.projects.timeEntries(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<TimeEntryWithUser[]>("/projects/time-entries", filters as Record<string, unknown>),
    ...options,
  });
}

export function useMyTimeEntries(
  userId: string,
  filters?: Omit<TimeEntryFilters, "userId">,
  options?: Omit<UseQueryOptions<TimeEntryWithUser[]>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<TimeEntryWithUser[]>({
    queryKey: queryKeys.projects.timeEntries({ userId, ...filters }),
    queryFn: () =>
      apiClient.get<TimeEntryWithUser[]>("/projects/time-entries", {
        userId,
        ...(filters as Record<string, unknown>),
      }),
    enabled: !!userId,
    ...options,
  });
}

export function useLogTime(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ticketId, ...data }: LogTimeInput) =>
      apiClient.post<TimeEntry>(
        `/projects/${projectId}/tickets/${ticketId}/time-entries`,
        data
      ),
    onSuccess: (_data: unknown, variables: LogTimeInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.timeEntries(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
    },
    ...options,
  });
}

export function useUpdateTimeEntry(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, ...data }: UpdateTimeEntryInput) =>
      apiClient.patch<TimeEntry>(`/projects/time-entries/${entryId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.timeEntries(),
      });
    },
    ...options,
  });
}

export function useDeleteTimeEntry(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId }: { entryId: number }) =>
      apiClient.delete<{ success: boolean }>(`/projects/time-entries/${entryId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.timeEntries(),
      });
    },
    ...options,
  });
}

export interface TeamTimesheetFilters {
  userId?: string;
  projectId?: number;
  startDate?: string;
  endDate?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
}

export function useAllTeamTimesheets(
  filters?: TeamTimesheetFilters,
  options?: Omit<UseQueryOptions<TimeEntryWithUser[]>, "queryKey" | "queryFn">
) {
  return useQuery<TimeEntryWithUser[]>({
    queryKey: [...queryKeys.projects.timeEntries(filters as Record<string, unknown>), "team"] as const,
    queryFn: () =>
      apiClient.get<TimeEntryWithUser[]>("/projects/time-entries/team", filters as Record<string, unknown>),
    ...options,
  });
}

export function useApproveTimesheet(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ timesheetId }: { timesheetId: number }) =>
      apiClient.patch<{ success: boolean }>(`/projects/time-entries/${timesheetId}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.timeEntries() });
    },
    ...options,
  });
}

export function useRejectTimesheet(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ timesheetId, reason }: { timesheetId: number; reason?: string }) =>
      apiClient.patch<{ success: boolean }>(`/projects/time-entries/${timesheetId}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.timeEntries() });
    },
    ...options,
  });
}

export interface BillingSummaryItem {
  projectId: number;
  projectName: string;
  totalHours: number | null;
}

export function useBillingSummary(params: { startDate: Date; endDate: Date }) {
  return useQuery<BillingSummaryItem[]>({
    queryKey: [...queryKeys.projects.all, "billingSummary", params.startDate, params.endDate] as const,
    queryFn: () =>
      apiClient.get<BillingSummaryItem[]>("/projects/billing-summary", {
        startDate: params.startDate.toISOString(),
        endDate: params.endDate.toISOString(),
      }),
  });
}
