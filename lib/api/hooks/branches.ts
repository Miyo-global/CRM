"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Branch } from "@/types/organization";

type BranchWithEmployees = Branch & {
  employees: {
    id: string;
    name: string | null;
    image: string | null;
    role: string | null;
    isActive: boolean | null;
  }[];
};

export const useBranches = (
  options?: Omit<UseQueryOptions<Branch[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery<Branch[], Error>({
    queryKey: queryKeys.branches.list(),
    queryFn: () => apiClient.get<Branch[]>("/branches"),
    ...options,
  });
};

export const useBranch = (
  id: number,
  options?: Omit<
    UseQueryOptions<BranchWithEmployees, Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) => {
  return useQuery<BranchWithEmployees, Error>({
    queryKey: queryKeys.branches.detail(id),
    queryFn: () => apiClient.get<BranchWithEmployees>(`/branches/${id}`),
    enabled: id > 0,
    ...options,
  });
};

interface CreateBranchInput {
  name: string;
  code: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  address?: string;
  phone?: string;
  email?: string;
  branchManagerId?: string;
  branchHrId?: string;
}

interface UpdateBranchInput extends Partial<CreateBranchInput> {
  id: number;
  status?: "ACTIVE" | "INACTIVE";
}

export const useCreateBranch = () => {
  const queryClient = useQueryClient();
  return useMutation<Branch, Error, CreateBranchInput>({
    mutationFn: (data) => apiClient.post<Branch>("/branches", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.recentActivity() });
    },
  });
};

export const useUpdateBranch = () => {
  const queryClient = useQueryClient();
  return useMutation<Branch, Error, UpdateBranchInput>({
    mutationFn: ({ id, ...data }) =>
      apiClient.patch<Branch>(`/branches/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.recentActivity() });
    },
  });
};

export const useDeleteBranch = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (id) => apiClient.delete(`/branches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.recentActivity() });
    },
  });
};
