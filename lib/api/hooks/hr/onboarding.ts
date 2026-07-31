"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";


export interface OnboardingStatus {
  userId: string;
  userName: string;
  totalTasks: number;
  completedTasks: number;
  percentComplete: number;
  lastCompletedAt: string | null;
}

export interface OnboardingTask {
  id: number;
  userId: string;
  orgId: string;
  templateStepId: number | null;
  title: string;
  description: string | null;
  ownerRole: string;
  dueDate: string | null;
  status: string;
  completedAt: string | null;
  completedBy: string | null;
  createdAt: string | null;
}

export interface OnboardingTemplateStep {
  id: number;
  templateId: number;
  title: string;
  description: string | null;
  ownerRole: string;
  dueOffsetDays: number;
  isRequired: boolean;
  sortOrder: number;
}

export interface HrOnboardingTemplate {
  id: number;
  orgId: string;
  name: string;
  departmentId: number | null;
  description: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
  steps: OnboardingTemplateStep[];
}

export interface CreateTemplateInput {
  name: string;
  departmentId?: number;
  description?: string;
  steps?: {
    title: string;
    description?: string;
    ownerRole?: string;
    dueOffsetDays?: number;
    isRequired?: boolean;
  }[];
}



export function useOnboardingStatus() {
  return useQuery<OnboardingStatus[]>({
    queryKey: ["onboarding", "status"],
    queryFn: () => apiClient.get<OnboardingStatus[]>("/onboarding"),
  });
}


export function useUserOnboarding(userId: string) {
  return useQuery<OnboardingTask[]>({
    queryKey: ["onboarding", "user", userId],
    queryFn: () => apiClient.get<OnboardingTask[]>(`/onboarding/${userId}`),
    enabled: !!userId,
  });
}


export function useCompleteOnboardingTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: "COMPLETED" | "PENDING" }) =>
      apiClient.patch<{ success: boolean }>(`/onboarding/tasks/${taskId}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding"] });
    },
  });
}


export function useInitiateOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.post<{ success: boolean; tasksCreated: number }>("/onboarding", { userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding", "status"] });
    },
  });
}


export function useHrOnboardingTemplates() {
  return useQuery<HrOnboardingTemplate[]>({
    queryKey: ["onboarding", "templates"],
    queryFn: () => apiClient.get<HrOnboardingTemplate[]>("/onboarding/templates"),
  });
}


export function useCreateHrOnboardingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTemplateInput) =>
      apiClient.post<{ success: boolean; templateId: number }>("/onboarding/templates", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding", "templates"] });
    },
  });
}
