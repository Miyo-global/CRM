"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Epic,
  Cycle,
  Module,
  ProjectPage,
  ProjectView,
  IntakeRequest,
  ProjectAnalytics,
  UpdateTicketInput,
  CreateCycleInput,
  UpdateCycleInput,
  CreateModuleInput,
  UpdateModuleInput,
  CreatePageInput,
  UpdatePageInput,
  CreateViewInput,
  UpdateViewInput,
  CreateIntakeRequestInput,
  UpdateIntakeRequestInput,
} from "@/types/projects";

export function useEpics(
  projectId: number,
  options?: Omit<UseQueryOptions<Epic[]>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<Epic[]>({
    queryKey: queryKeys.projects.epics(projectId),
    queryFn: () => apiClient.get<Epic[]>(`/projects/${projectId}/epics`),
    enabled: !!projectId,
    ...options,
  });
}

export type CreateEpicInput = {
  projectId: number;
  title: string;
  description?: string;
  priority?: string;
  assigneeId?: string;
  points?: number;
};

export function useCreateEpic(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: CreateEpicInput) => {
      const { projectId, ...data } = variables;
      return apiClient.post<Epic>(`/projects/${projectId}/epics`, data);
    },
    onSuccess: (_data: unknown, variables: CreateEpicInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.epics(variables.projectId),
      });
    },
    ...options,
  });
}

export function useUpdateEpic(
  projectId: number,
  options?: Parameters<typeof useMutation>[0]
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, ...data }: UpdateTicketInput) =>
      apiClient.patch<{ success: boolean }>(
        `/projects/${projectId}/tickets/${ticketId}`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.epics(projectId),
      });
    },
    ...options,
  });
}

export function useCycles(
  projectId: number,
  options?: Omit<UseQueryOptions<Cycle[]>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<Cycle[]>({
    queryKey: queryKeys.projects.cycles(projectId),
    queryFn: () => apiClient.get<Cycle[]>(`/projects/${projectId}/cycles`),
    enabled: !!projectId,
    ...options,
  });
}

export function useCreateCycle(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...data }: CreateCycleInput) =>
      apiClient.post<Cycle>(`/projects/${projectId}/cycles`, data),
    onSuccess: (_data: unknown, variables: CreateCycleInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.cycles(variables.projectId),
      });
    },
    ...options,
  });
}

export function useUpdateCycle(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId, ...data }: UpdateCycleInput & { projectId: number }) =>
      apiClient.patch<Cycle>(`/projects/${projectId}/cycles/${id}`, data),
    onSuccess: (_data: unknown, variables: UpdateCycleInput & { projectId: number }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.cycles(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
    },
    ...options,
  });
}

export function useModules(
  projectId: number,
  options?: Omit<UseQueryOptions<Module[]>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<Module[]>({
    queryKey: queryKeys.projects.modules(projectId),
    queryFn: () => apiClient.get<Module[]>(`/projects/${projectId}/modules`),
    enabled: !!projectId,
    ...options,
  });
}

export function useCreateModule(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...data }: CreateModuleInput) =>
      apiClient.post<Module>(`/projects/${projectId}/modules`, data),
    onSuccess: (_data: unknown, variables: CreateModuleInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.modules(variables.projectId),
      });
    },
    ...options,
  });
}

export function useUpdateModule(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId, ...data }: UpdateModuleInput & { projectId: number }) =>
      apiClient.patch<Module>(`/projects/${projectId}/modules/${id}`, data),
    onSuccess: (_data: unknown, variables: UpdateModuleInput & { projectId: number }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.modules(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
    },
    ...options,
  });
}

export function useDeleteModule(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, moduleId }: { projectId: number; moduleId: number }) =>
      apiClient.delete<{ success: boolean }>(
        `/projects/${projectId}/modules/${moduleId}`,
      ),
    onSuccess: (_data: unknown, variables: { projectId: number; moduleId: number }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.modules(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
    },
    ...options,
  });
}

export function usePages(
  projectId: number,
  options?: Omit<UseQueryOptions<ProjectPage[]>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<ProjectPage[]>({
    queryKey: queryKeys.projects.pages(projectId),
    queryFn: () => apiClient.get<ProjectPage[]>(`/projects/${projectId}/pages`),
    enabled: !!projectId,
    ...options,
  });
}

export function useCreatePage(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...data }: CreatePageInput) =>
      apiClient.post<ProjectPage>(`/projects/${projectId}/pages`, data),
    onSuccess: (_data: unknown, variables: CreatePageInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.pages(variables.projectId),
      });
    },
    ...options,
  });
}

export function useUpdatePage(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId, ...data }: UpdatePageInput & { projectId: number }) =>
      apiClient.patch<ProjectPage>(`/projects/${projectId}/pages/${id}`, data),
    onSuccess: (_data: unknown, variables: UpdatePageInput & { projectId: number }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.pages(variables.projectId),
      });
    },
    ...options,
  });
}

export function useViews(
  projectId: number,
  options?: Omit<UseQueryOptions<ProjectView[]>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<ProjectView[]>({
    queryKey: queryKeys.projects.views(projectId),
    queryFn: () => apiClient.get<ProjectView[]>(`/projects/${projectId}/views`),
    enabled: !!projectId,
    ...options,
  });
}

export function useCreateView(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...data }: CreateViewInput) =>
      apiClient.post<ProjectView>(`/projects/${projectId}/views`, data),
    onSuccess: (_data: unknown, variables: CreateViewInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.views(variables.projectId),
      });
    },
    ...options,
  });
}

export function useUpdateView(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId, ...data }: UpdateViewInput & { projectId: number }) =>
      apiClient.patch<ProjectView>(`/projects/${projectId}/views/${id}`, data),
    onSuccess: (_data: unknown, variables: UpdateViewInput & { projectId: number }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.views(variables.projectId),
      });
    },
    ...options,
  });
}

export function useDeleteView(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: number; projectId: number }) =>
      apiClient.delete<{ success: boolean }>(`/projects/${projectId}/views/${id}`),
    onSuccess: (_data: unknown, variables: { id: number; projectId: number }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.views(variables.projectId),
      });
    },
    ...options,
  });
}

export function useIntakeRequests(
  projectId: number,
  status?: string,
  options?: Omit<
    UseQueryOptions<{ items: IntakeRequest[]; total: number }>,
    "queryKey" | "queryFn" | "enabled"
  >
) {
  return useQuery<{ items: IntakeRequest[]; total: number }>({
    queryKey: queryKeys.projects.intake(projectId),
    queryFn: () =>
      apiClient.get<{ items: IntakeRequest[]; total: number }>(
        `/projects/${projectId}/intake`,
        status ? { status } : undefined
      ),
    enabled: !!projectId,
    ...options,
  });
}

export function useCreateIntakeRequest(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...data }: CreateIntakeRequestInput) =>
      apiClient.post<IntakeRequest>(`/projects/${projectId}/intake`, data),
    onSuccess: (_data: unknown, variables: CreateIntakeRequestInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.intake(variables.projectId),
      });
    },
    ...options,
  });
}

export function useUpdateIntakeRequest(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId, ...data }: UpdateIntakeRequestInput & { projectId: number }) =>
      apiClient.patch<{ success: boolean }>(
        `/projects/${projectId}/intake/${id}`,
        data
      ),
    onSuccess: (_data: unknown, variables: UpdateIntakeRequestInput & { projectId: number }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.intake(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
    },
    ...options,
  });
}

export function useProjectAnalytics(
  projectId: number,
  options?: Omit<UseQueryOptions<ProjectAnalytics>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<ProjectAnalytics>({
    queryKey: queryKeys.projects.analytics(projectId),
    queryFn: () =>
      apiClient.get<ProjectAnalytics>(`/projects/${projectId}/analytics`),
    enabled: !!projectId,
    refetchInterval: 30_000,
    ...options,
  });
}
