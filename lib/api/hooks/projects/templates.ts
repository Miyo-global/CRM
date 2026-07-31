"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";


export interface ProjectTemplateTicket {
  id: number;
  templateId: number;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  estimatedHours: string | null;
  order: number;
  phase: string | null;
}

export interface ProjectTemplate {
  id: number;
  orgId: string;
  name: string;
  description: string | null;
  category: string;
  createdBy: string | null;
  createdAt: string | null;
  tickets: ProjectTemplateTicket[];
}

export interface CreateProjectTemplateInput {
  name: string;
  description?: string;
  category?: string;
  tickets: Array<{
    title: string;
    description?: string;
    type?: string;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    estimatedHours?: number;
    order?: number;
    phase?: string;
  }>;
}

export interface ApplyProjectTemplateInput {
  name: string;
  description?: string;
  managerId?: string;
  startDate?: string;
  endDate?: string;
}

const TEMPLATES_KEY = ["miyoglobal", "project-templates"] as const;


export function useProjectTemplates() {
  return useQuery({
    queryKey: TEMPLATES_KEY,
    queryFn: () => apiClient.get<ProjectTemplate[]>("/projects/templates"),
    staleTime: 60_000,
  });
}

export function useCreateProjectTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectTemplateInput) =>
      apiClient.post<ProjectTemplate>("/projects/templates", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  });
}

export function useDeleteProjectTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/projects/templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  });
}

export function useApplyProjectTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, input }: { templateId: number; input: ApplyProjectTemplateInput }) =>
      apiClient.post<{ projectId: number; key: string; ticketsCreated: number }>(
        `/projects/templates/${templateId}/apply`,
        input,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["miyoglobal", "projects"] });
    },
  });
}
