"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import type { UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { mergeMutationOptions } from "@/lib/api/hooks/mutation-options";
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
  CreateLabelInput,
  ProjectRoleValue,
} from "@/types/projects";

export function useProjects(
  filters?: ProjectFilters,
  options?: Omit<UseQueryOptions<PaginatedResponse<ProjectListItem>>, "queryKey" | "queryFn">
) {
  return useQuery<PaginatedResponse<ProjectListItem>>({
    queryKey: queryKeys.projects.list(filters as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<PaginatedResponse<ProjectListItem>>("/projects", filters as Record<string, unknown>),
    placeholderData: keepPreviousData,
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
  return useMutation(mergeMutationOptions({
    mutationFn: (data: CreateProjectInput) => apiClient.post<Project>("/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  }, options));
}

export function useUpdateProject(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation(mergeMutationOptions({
    mutationFn: ({ projectId, ...data }: UpdateProjectInput) =>
      apiClient.patch<{ success: boolean }>(`/projects/${projectId}`, data),
    onSuccess: (_data: unknown, variables: UpdateProjectInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  }, options));
}

export function useDeleteProject(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, { projectId: number }>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { projectId: number }>(mergeMutationOptions({
    mutationFn: ({ projectId }) =>
      apiClient.delete<{ success: boolean }>(`/projects/${projectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  }, options));
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

export function useRemoveProjectMember(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation(mergeMutationOptions({
    mutationFn: ({ projectId, userId }: { projectId: number; userId: string }) =>
      apiClient.delete<{ success: boolean }>(`/projects/${projectId}/members`, {
        data: { userId },
      }),
    onSuccess: (_data: unknown, variables: { projectId: number; userId: string }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.members(variables.projectId),
      });
    },
  }, options));
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
  return useMutation(mergeMutationOptions({
    mutationFn: (data: CreateLabelInput) =>
      apiClient.post<TicketLabel>(`/projects/${projectId}/labels`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.labels(projectId),
      });
    },
  }, options));
}

type ProjectPatch = Pick<UpdateProjectInput, "projectId" | "status" | "priority">;
type ListSnapshot = [readonly unknown[], PaginatedResponse<ProjectListItem> | undefined][];

export function useInlineUpdateProject() {
  const queryClient = useQueryClient();
  const listPrefix = [...queryKeys.projects.all, "list"];
  return useMutation<{ success: boolean }, Error, ProjectPatch, { snapshot: ListSnapshot }>({
    mutationFn: ({ projectId, ...data }) => apiClient.patch<{ success: boolean }>(`/projects/${projectId}`, data),
    onMutate: async ({ projectId, ...patch }) => {
      await queryClient.cancelQueries({ queryKey: listPrefix });
      const snapshot = queryClient.getQueriesData<PaginatedResponse<ProjectListItem>>({ queryKey: listPrefix });
      queryClient.setQueriesData<PaginatedResponse<ProjectListItem>>({ queryKey: listPrefix }, (old) =>
        old
          ? {
              ...old,
              data: old.data.map((p) =>
                p.id === projectId
                  ? {
                      ...p,
                      ...patch,
                      archivedAt: patch.status === undefined ? p.archivedAt : patch.status === "ARCHIVED" ? new Date().toISOString() : null,
                    }
                  : p,
              ),
            }
          : old,
      );
      return { snapshot };
    },
    onError: (_error, _vars, context) => {
      for (const [key, value] of context?.snapshot ?? []) queryClient.setQueryData(key, value);
    },
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

export function useUpdateProjectMemberRole(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, { userId: string; role: ProjectRoleValue }>({
    mutationFn: (data) => apiClient.patch(`/projects/${projectId}/members`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.members(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

export function useInviteToProject(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation<{ added: boolean; invited: boolean }, Error, { email: string; role: ProjectRoleValue }>({
    mutationFn: (data) => apiClient.post(`/projects/${projectId}/members/invite`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.members(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

export function useUpdateWipLimit(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, { statusId: number; wipLimit: number | null }>({
    mutationFn: ({ statusId, wipLimit }) => apiClient.patch(`/projects/${projectId}/statuses/${statusId}`, { wipLimit }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}
