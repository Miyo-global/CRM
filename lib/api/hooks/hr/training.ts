"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface TrainingProgram {
  id: number;
  orgId: string;
  title: string;
  description: string | null;
  category: string | null;
  duration: string | null;
  instructor: string | null;
  maxParticipants: number | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | null;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  meetingLink: string | null;
  createdAt: Date | string | null;
  enrollments?: TrainingEnrollment[];
}

export interface TrainingEnrollment {
  id: number;
  programId: number;
  userId: string;
  status: "ENROLLED" | "IN_PROGRESS" | "COMPLETED" | "DROPPED" | null;
  completedAt: Date | string | null;
  score: number | null;
  enrolledAt: Date | string | null;
}

const trainingKeys = {
  all: [...queryKeys.hr.all, "training"] as const,
  list: () => [...trainingKeys.all, "list"] as const,
};

export function useTrainingPrograms() {
  return useQuery({
    queryKey: trainingKeys.list(),
    queryFn: () => apiClient.get<TrainingProgram[]>("/hr/training"),
  });
}

export function useCreateTrainingProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      category?: string;
      duration?: string;
      instructor?: string;
      maxParticipants?: number;
      startDate?: string;
      endDate?: string;
      location?: string;
      meetingLink?: string;
    }) => apiClient.post<TrainingProgram>("/hr/training", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: trainingKeys.list() }),
  });
}

export function useUpdateTrainingProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; title?: string; status?: string; [key: string]: unknown }) =>
      apiClient.patch<{ success: boolean }>(`/hr/training/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: trainingKeys.list() }),
  });
}

export function useDeleteTrainingProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/hr/training/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: trainingKeys.list() }),
  });
}

export function useEnrollInProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, userId }: { programId: number; userId?: string }) =>
      apiClient.post<TrainingEnrollment>(`/hr/training/${programId}/enroll`, { userId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: trainingKeys.list() }),
  });
}
