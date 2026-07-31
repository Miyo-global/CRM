"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Project,
  ProjectListItem,
  ProjectWithDetails,
  ProjectMember,
  TicketLabel,
  PaginatedResponse,
  ProjectFilters,
  CreateProjectInput,
  UpdateProjectInput,
  AddProjectMemberInput,
  CreateLabelInput,
} from "@/types/projects";

export function useProjects(
  filters?: ProjectFilters,
  options?: Omit<UseQueryOptions<PaginatedResponse<ProjectListItem>>, "queryKey" | "queryFn">
) {
  return useQuery<PaginatedResponse<ProjectListItem>>({
    queryKey: queryKeys.projects.list(),
    queryFn: () =>
      apiClient.get<PaginatedResponse<ProjectListItem>>("/projects", filters as Record<string, unknown>),
    refetchInterval: 30_000,
    ...options,
  });
}

export function useProject(
  id: number,
  options?: Omit<UseQueryOptions<ProjectWithDetails | null>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<ProjectWithDetails | null>({
    queryKey: queryKeys.projects.detail(id),
    queryFn: () => apiClient.get<ProjectWithDetails | null>(`/projects/${id}`),
    enabled: !!id,
    ...options,
  });
}

export function useCreateProject(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProjectInput) => apiClient.post<Project>("/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    ...options,
  });
}

export function useUpdateProject(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...data }: UpdateProjectInput) =>
      apiClient.patch<{ success: boolean }>(`/projects/${projectId}`, data),
    onSuccess: (_data: unknown, variables: UpdateProjectInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    ...options,
  });
}

export function useDeleteProject(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, { projectId: number }>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { projectId: number }>({
    mutationFn: ({ projectId }) =>
      apiClient.delete<{ success: boolean }>(`/projects/${projectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    ...options,
  });
}

export function useProjectMembers(
  projectId: number,
  options?: Omit<UseQueryOptions<ProjectMember[]>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<ProjectMember[]>({
    queryKey: queryKeys.projects.members(projectId),
    queryFn: () => apiClient.get<ProjectMember[]>(`/projects/${projectId}/members`),
    enabled: !!projectId,
    ...options,
  });
}

export function useAddProjectMember(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...data }: AddProjectMemberInput) =>
      apiClient.post<ProjectMember>(`/projects/${projectId}/members`, data),
    onSuccess: (_data: unknown, variables: AddProjectMemberInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.members(variables.projectId),
      });
    },
    ...options,
  });
}

export function useRemoveProjectMember(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, userId }: { projectId: number; userId: string }) =>
      apiClient.delete<{ success: boolean }>(`/projects/${projectId}/members`, {
        data: { userId },
      }),
    onSuccess: (_data: unknown, variables: { projectId: number; userId: string }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.members(variables.projectId),
      });
    },
    ...options,
  });
}

export function useProjectLabels(
  projectId?: number,
  options?: Omit<UseQueryOptions<TicketLabel[]>, "queryKey" | "queryFn">
) {
  return useQuery<TicketLabel[]>({
    queryKey: queryKeys.projects.labels(projectId),
    queryFn: () =>
      projectId
        ? apiClient.get<TicketLabel[]>(`/projects/${projectId}/labels`)
        : apiClient.get<TicketLabel[]>("/projects/labels"),
    ...options,
  });
}

export function useCreateLabel(
  projectId: number,
  options?: Parameters<typeof useMutation>[0]
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLabelInput) =>
      apiClient.post<TicketLabel>(`/projects/${projectId}/labels`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.labels(projectId),
      });
    },
    ...options,
  });
}
