"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Permission } from "@/types/organization";

export const useUserPermissions = (
  options?: Omit<UseQueryOptions<string[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery<string[], Error>({
    queryKey: queryKeys.rbac.userPermissions(),
    queryFn: () => apiClient.get<string[]>("/rbac/user-permissions"),
    ...options,
  });
};

export const useAllPermissions = (
  options?: Omit<
    UseQueryOptions<Permission[], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<Permission[], Error>({
    queryKey: queryKeys.rbac.allPermissions(),
    queryFn: () => apiClient.get<Permission[]>("/rbac/permissions"),
    staleTime: Infinity,
    ...options,
  });
};

export const useRolePermissions = (
  role: string,
  options?: Omit<
    UseQueryOptions<string[], Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) => {
  return useQuery<string[], Error>({
    queryKey: queryKeys.rbac.rolePermissions(role),
    queryFn: () =>
      apiClient.get<string[]>("/rbac/role-permissions", { role }),
    enabled: !!role,
    ...options,
  });
};

export const useUpdateRolePermissions = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean },
    Error,
    { role: string; permissionId: number }
  >({
    mutationFn: (data) =>
      apiClient.post<{ success: boolean }>("/rbac/role-permissions", data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.rbac.rolePermissions(variables.role),
      });
    },
  });
};

export const useRbacUserPermissions = useUserPermissions;
