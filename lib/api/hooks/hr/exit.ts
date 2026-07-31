"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface Resignation {
  id: number;
  orgId: string;
  userId: string;
  reason: string | null;
  reasonCategory: string | null;
  lastWorkingDate: string | null;
  noticePeriodDays: number | null;
  status: "SUBMITTED" | "PENDING_HR" | "HR_APPROVED" | "CEO_APPROVED" | "IN_PROGRESS" | "APPROVED" | "WITHDRAWN" | "COMPLETED" | "REJECTED" | null;
  resignationLetterUrl: string | null;
  approvedBy: string | null;
  approvedAt: Date | string | null;
  hrReviewedBy: string | null;
  hrReviewedAt: Date | string | null;
  hrRemarks: string | null;
  ceoReviewedBy: string | null;
  ceoReviewedAt: Date | string | null;
  ceoRemarks: string | null;
  willingForExitInterview: boolean | null;
  companyFeedback: string | null;
  exitInterviewNotes: string | null;
  exitInterviewDate: Date | string | null;
  feedback: { question: string; answer: string }[] | null;
  createdAt: Date | string | null;
  user?: { id: string; name: string | null; image: string | null; email: string; designation: string | null; joiningDate?: string | null } | null;
  hrReviewer?: { id: string; name: string | null } | null;
  ceoReviewer?: { id: string; name: string | null } | null;
  checklists?: { id: number; item: string; status: string | null; completedAt: Date | string | null }[];
}

export interface ResignationProgressStep {
  step?: string;
  label: string;
  status: "completed" | "current" | "active" | "pending" | "rejected";
  timestamp?: string | null;
  actor?: string | null;
  remarks?: string | null;
}

export interface ResignationProgress {
  label: string;
  status: "completed" | "active" | "rejected" | "pending";
  actor: string | null;
  timestamp: string | null;
  remarks: string | null;
  steps: ResignationProgressStep[];
}

export interface ResignationDetail extends Resignation {
  progress: ResignationProgress[];
}

export interface ResignationAnalytics {
  totalEmployees: number;
  totalResignations: number;
  attritionRate: number;
  averageTenureMonths: number;
  reasonBreakdown: { category: string; count: number }[];
  monthlyTrend: { month: string; count: number }[];
  statusCounts: Record<string, number>;
}

const exitKeys = {
  all: [...queryKeys.hr.all, "exit"] as const,
  list: () => [...exitKeys.all, "list"] as const,
  detail: (id: number) => [...exitKeys.all, "detail", id] as const,
  letter: (id: number) => [...exitKeys.all, "letter", id] as const,
  analytics: () => [...exitKeys.all, "analytics"] as const,
  progress: (id: number) => [...exitKeys.all, "progress", id] as const,
};

export function useResignationAnalytics() {
  return useQuery({
    queryKey: exitKeys.analytics(),
    queryFn: () => apiClient.get<ResignationAnalytics>("/hr/exit/analytics"),
    staleTime: 5 * 60_000,
  });
}

export function useResignations() {
  return useQuery({
    queryKey: exitKeys.list(),
    queryFn: () => apiClient.get<Resignation[]>("/hr/exit"),
  });
}

export function useResignationDetail(id: number | null) {
  return useQuery({
    queryKey: exitKeys.detail(id ?? 0),
    queryFn: () => apiClient.get<ResignationDetail>(`/hr/exit/${id}`),
    enabled: !!id,
  });
}

export function useResignationLetter(id: number | null) {
  return useQuery({
    queryKey: exitKeys.letter(id ?? 0),
    queryFn: () => apiClient.get<{ html: string }>(`/hr/exit/${id}/letter`),
    enabled: !!id,
  });
}

export function useCreateResignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      reason: string;
      reasonCategory: string;
      reasonCategoryOther?: string;
      lastWorkingDate: string;
      noticePeriodDays?: number;
      willingForExitInterview?: boolean;
      companyFeedback?: string;
    }) => apiClient.post<Resignation>("/hr/exit", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: exitKeys.list() }),
  });
}

export function useUpdateResignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: number;
      status?: string;
      remarks?: string;
      exitInterviewNotes?: string;
      exitInterviewDate?: string;
      feedback?: { question: string; answer: string }[];
      checklistItems?: string[];
    }) => apiClient.patch<{ success: boolean }>(`/hr/exit/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: exitKeys.all });
    },
  });
}

export function useHrReviewResignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, remarks }: { id: number; action: "approve" | "reject"; remarks?: string }) =>
      apiClient.patch<{ success: boolean }>(`/hr/exit/${id}/hr-review`, { action, remarks }),
    onSuccess: () => qc.invalidateQueries({ queryKey: exitKeys.list() }),
  });
}

export function useCeoReviewResignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, remarks }: { id: number; action: "approve" | "reject"; remarks?: string }) =>
      apiClient.patch<{ success: boolean }>(`/hr/exit/${id}/ceo-review`, { action, remarks }),
    onSuccess: () => qc.invalidateQueries({ queryKey: exitKeys.list() }),
  });
}

export function useWithdrawResignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) =>
      apiClient.patch<{ success: boolean }>(`/hr/exit/${id}/withdraw`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: exitKeys.list() }),
  });
}

export function useResignationProgress(id: number, enabled: boolean) {
  return useQuery({
    queryKey: exitKeys.progress(id),
    queryFn: () => apiClient.get<ResignationProgress>(`/hr/exit/${id}/progress`),
    enabled,
  });
}
