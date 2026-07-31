"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface ProjectMilestone {
  id: number;
  projectId: number;
  orgId: string;
  name: string;
  description: string | null;
  targetDate: string;
  status: "PENDING" | "ACHIEVED" | "MISSED";
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateMilestoneInput {
  name: string;
  description?: string;
  targetDate: string;
  status?: "PENDING" | "ACHIEVED" | "MISSED";
}

export interface UpdateMilestoneInput {
  name?: string;
  description?: string;
  targetDate?: string;
  status?: "PENDING" | "ACHIEVED" | "MISSED";
}

export interface ProjectBudget {
  projectId: number;
  plannedBudget: number;
  actualCost: number;
  remaining: number;
  utilizationPct: number;
  totalHours: number;
  memberBreakdown: { userId: string; hours: number; cost: number }[];
}

export interface ResourceAllocationEntry {
  user: { id: string; name: string | null; email: string; image: string | null };
  totalOpen: number;
  byProject: { projectId: number; projectName: string; projectKey: string; open: number }[];
}

function milestoneKey(projectId: number) {
  return ["miyoglobal", "projects", projectId, "milestones"] as const;
}


export function useProjectMilestones(projectId: number) {
  return useQuery({
    queryKey: milestoneKey(projectId),
    queryFn: () => apiClient.get<ProjectMilestone[]>(`/projects/${projectId}/milestones`),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useCreateMilestone(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMilestoneInput) =>
      apiClient.post<ProjectMilestone>(`/projects/${projectId}/milestones`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: milestoneKey(projectId) }),
  });
}

export function useUpdateMilestone(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateMilestoneInput & { id: number }) =>
      apiClient.patch<ProjectMilestone>(`/projects/${projectId}/milestones/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: milestoneKey(projectId) }),
  });
}

export function useDeleteMilestone(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/projects/${projectId}/milestones/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: milestoneKey(projectId) }),
  });
}


export function useProjectBudget(projectId: number) {
  return useQuery({
    queryKey: ["miyoglobal", "projects", projectId, "budget"] as const,
    queryFn: () => apiClient.get<ProjectBudget>(`/projects/${projectId}/budget`),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useUpdateProjectBudget(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (budget: number) =>
      apiClient.patch<{ id: number; budget: string }>(`/projects/${projectId}/budget`, { budget }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["miyoglobal", "projects", projectId, "budget"] }),
  });
}


export function useResourceAllocation() {
  return useQuery({
    queryKey: ["miyoglobal", "projects", "resource-allocation"] as const,
    queryFn: () => apiClient.get<ResourceAllocationEntry[]>("/projects/resource-allocation"),
    staleTime: 60_000,
  });
}
