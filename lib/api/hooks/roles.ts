"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Role } from "@/types/organization";

export const useRoles = (
  options?: Omit<UseQueryOptions<Role[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery<Role[], Error>({
    queryKey: queryKeys.roles.list(),
    queryFn: () => apiClient.get<Role[]>("/roles"),
    ...options,
  });
};

export const useRole = (
  id: number,
  options?: Omit<
    UseQueryOptions<Role, Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) => {
  return useQuery<Role, Error>({
    queryKey: queryKeys.roles.detail(id),
    queryFn: () => apiClient.get<Role>(`/roles/${id}`),
    enabled: id > 0,
    ...options,
  });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();
  return useMutation<
    Role,
    Error,
    { name: string; slug: string; permissions?: string[] }
  >({
    mutationFn: (data) => apiClient.post<Role>("/roles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    },
  });
};

export const useUpdateRole = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean },
    Error,
    { id: number; name?: string; permissions?: string[] }
  >({
    mutationFn: ({ id, ...data }) =>
      apiClient.patch<{ success: boolean }>(`/roles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    },
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (id) =>
      apiClient.delete<{ success: boolean }>(`/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    },
  });
};

export function useRolesList(
  options?: Omit<UseQueryOptions<Role[], Error>, "queryKey" | "queryFn">
) {
  return useRoles(options);
}


export interface RoleTemplate {
  id: string;
  name: string;
  slug: string;
  permissions: readonly string[];
}

export function useRoleTemplates() {
  return useQuery<RoleTemplate[], Error>({
    queryKey: [...queryKeys.roles.all, "templates"] as const,
    queryFn: () => apiClient.get<RoleTemplate[]>("/roles/templates"),
    staleTime: 10 * 60_000,
  });
}

export function useCloneRoleTemplate() {
  const queryClient = useQueryClient();
  return useMutation<Role, Error, { templateId: string; name?: string; slug?: string }>({
    mutationFn: (data) => apiClient.post<Role>("/roles/templates", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.roles.all }),
  });
}
