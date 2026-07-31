"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { TicketWatcher } from "@/types/projects";

export function useWatchers(
  projectId: number,
  ticketId: number,
  options?: Omit<UseQueryOptions<TicketWatcher[]>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<TicketWatcher[]>({
    queryKey: queryKeys.projects.watchers(ticketId),
    queryFn: () =>
      apiClient.get<TicketWatcher[]>(
        `/projects/${projectId}/tickets/${ticketId}/watchers`
      ),
    enabled: !!ticketId && !!projectId,
    ...options,
  });
}

export function useToggleWatch(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ticketId,
      watching,
    }: {
      ticketId: number;
      watching: boolean;
    }) => {
      if (watching) {
        return apiClient.delete<{ success: boolean }>(
          `/projects/${projectId}/tickets/${ticketId}/watchers`
        );
      }
      return apiClient.post<{ success: boolean }>(
        `/projects/${projectId}/tickets/${ticketId}/watchers`,
        {}
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.watchers(variables.ticketId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
    },
  });
}

export function useAddWatcher(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ticketId,
      userId,
    }: {
      ticketId: number;
      userId: string;
    }) =>
      apiClient.post<{ success: boolean }>(
        `/projects/${projectId}/tickets/${ticketId}/watchers`,
        { userId }
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.watchers(variables.ticketId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
    },
  });
}

export function useRemoveWatcher(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ticketId,
      userId,
    }: {
      ticketId: number;
      userId: string;
    }) =>
      apiClient.delete<{ success: boolean }>(
        `/projects/${projectId}/tickets/${ticketId}/watchers`,
        { params: { userId } }
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.watchers(variables.ticketId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
    },
  });
}
