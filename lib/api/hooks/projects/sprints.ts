"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Sprint,
  SprintBurndown,
  CreateSprintInput,
  UpdateSprintInput,
} from "@/types/projects";

export function useSprints(
  projectId?: number,
  options?: Omit<UseQueryOptions<Sprint[]>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<Sprint[]>({
    queryKey: queryKeys.projects.sprints(projectId),
    queryFn: () =>
      apiClient.get<Sprint[]>(`/projects/${projectId}/sprints`),
    enabled: !!projectId,
    ...options,
  });
}

export function useSprint(
  projectId: number,
  sprintId: number,
  options?: Omit<UseQueryOptions<Sprint | null>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<Sprint | null>({
    queryKey: queryKeys.projects.sprint(sprintId),
    queryFn: () =>
      apiClient.get<Sprint | null>(`/projects/${projectId}/sprints/${sprintId}`),
    enabled: !!sprintId && !!projectId,
    ...options,
  });
}

export function useCreateSprint(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...data }: CreateSprintInput) =>
      apiClient.post<Sprint>(`/projects/${projectId}/sprints`, data),
    onSuccess: (_data: unknown, variables: CreateSprintInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.sprints(variables.projectId),
      });
    },
    ...options,
  });
}

export function useUpdateSprint(
  projectId: number,
  options?: Parameters<typeof useMutation>[0]
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sprintId, ...data }: UpdateSprintInput) =>
      apiClient.patch<{ success: boolean }>(
        `/projects/${projectId}/sprints/${sprintId}`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.sprints(projectId),
      });
    },
    ...options,
  });
}

export function useStartSprint(
  projectId: number,
  options?: Parameters<typeof useMutation>[0]
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sprintId }: { sprintId: number }) =>
      apiClient.patch<{ success: boolean }>(
        `/projects/${projectId}/sprints/${sprintId}`,
        { status: "ACTIVE" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.sprints(projectId),
      });
    },
    ...options,
  });
}

export function useCompleteSprint(
  projectId: number,
  options?: Parameters<typeof useMutation>[0]
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sprintId }: { sprintId: number }) =>
      apiClient.patch<{ success: boolean }>(
        `/projects/${projectId}/sprints/${sprintId}`,
        { status: "COMPLETED" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.sprints(projectId),
      });
    },
    ...options,
  });
}

export function useSprintBurndown(
  projectId: number,
  sprintId: number,
  options?: Omit<UseQueryOptions<SprintBurndown>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<SprintBurndown>({
    queryKey: queryKeys.projects.burndown(sprintId),
    queryFn: () =>
      apiClient.get<SprintBurndown>(
        `/projects/${projectId}/sprints/${sprintId}/burndown`
      ),
    enabled: !!sprintId && !!projectId,
    ...options,
  });
}
