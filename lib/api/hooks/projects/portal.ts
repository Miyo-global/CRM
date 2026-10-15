"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type PortalProject = {
  project: { name: string; description: string | null; status: string | null; startDate: string | null; endDate: string | null } | null;
  capabilities: { canViewMilestones: boolean; canViewTasks: boolean; canSubmitRequests: boolean };
  milestones: { id: number; name: string; targetDate: string; status: string }[];
  tickets: { id: number; title: string; status: string; dueDate: string | null }[];
};

export function usePortalProjects() {
  return useQuery<{ id: number; name: string; key: string; status: string | null }[]>({
    queryKey: ["portal", "projects"],
    queryFn: () => apiClient.get("/portal/projects"),
  });
}

export function usePortalProject(projectId: number) {
  return useQuery<PortalProject>({
    queryKey: ["portal", "project", projectId],
    queryFn: () => apiClient.get(`/portal/projects/${projectId}`),
    enabled: projectId > 0,
    retry: false,
  });
}

export function usePortalRequest(projectId: number) {
  return useMutation<unknown, Error, { title: string; description?: string }>({
    mutationFn: (data) => apiClient.post(`/portal/projects/${projectId}/requests`, data),
  });
}
