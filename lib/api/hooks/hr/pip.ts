"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { PipPhase, PipManagementDecision, MonitoringPeriodDays, PipDocType } from "@/lib/validations/hr-pip";

const pipKeys = {
  all: [...queryKeys.hr.all, "pip"] as const,
  list: () => [...pipKeys.all, "list"] as const,
  documents: (id: number) => [...pipKeys.all, "detail", id, "docs"] as const,
};

export interface PIPGoal {
  id: number;
  pipId: number;
  title: string;
  description: string | null;
  successCriteria: string;
  deadline: string;
  sortOrder: number | null;
}

export interface PIPDocument {
  id: number;
  pipId: number;
  docType: PipDocType;
  title: string;
  content: string;
  uploadedBy: string | null;
  createdAt: string | null;
  uploader?: { id: string; name: string | null } | null;
}

export interface PIP {
  id: number;
  userId: string;
  managerId: string;
  hrRepId: string | null;
  mentorId: string | null;
  reason: string;
  objectives: { objective: string; metric: string; deadline: string }[] | null;
  startDate: string;
  endDate: string;
  status: "DRAFT" | "ACTIVE" | "EXTENDED" | "COMPLETED" | "TERMINATED" | null;
  outcome: string | null;
  notes: string | null;
  reasonCategory: string | null;
  reasonEntries?: { category: string; description: string }[] | null;
  description: string | null;
  areasOfConcern: string[] | null;
  evidence: string | null;
  reviewFrequency: string | null;
  reviewMethod: string | null;
  expectedImprovement: string | null;
  consequencesIfNotMet: string | null;
  linkedAppraisalId: number | null;
  finalOutcome: string | null;
  acknowledgedAt: string | Date | null;
  phase: PipPhase | null;
  sufficientEvidence: boolean | null;
  performanceImprovedCounseling: boolean | null;
  counselingDate: string | null;
  counselingNotes: string | null;
  monitoringPeriodDays: MonitoringPeriodDays | null;
  managementDecision: PipManagementDecision | null;
  midpointAssessmentNotes: string | null;
  midpointOnTrack: boolean | null;
  user?: { id: string; name: string | null; image: string | null; email: string | null } | null;
  manager?: { id: string; name: string | null } | null;
  hrRep?: { id: string; name: string | null } | null;
  mentor?: { id: string; name: string | null } | null;
  goals?: PIPGoal[];
}

export function usePIPs() {
  return useQuery({
    queryKey: pipKeys.list(),
    queryFn: () => apiClient.get<PIP[]>("/hr/performance/pip"),
  });
}

export function usePIPDetail(id: number | null) {
  return useQuery({
    queryKey: [...pipKeys.all, "detail", id],
    queryFn: () => apiClient.get<PIP>(`/hr/performance/pip/${id}`),
    enabled: !!id && id > 0,
  });
}

export function usePIPDocuments(pipId: number | null) {
  return useQuery({
    queryKey: pipKeys.documents(pipId ?? 0),
    queryFn: () => apiClient.get<PIPDocument[]>(`/hr/performance/pip/${pipId}/documents`),
    enabled: !!pipId && pipId > 0,
  });
}

export interface CreatePIPInput {
  userId: string;
  hrRepId: string;
  reasons: {
    category: "POOR_PERFORMANCE" | "BEHAVIORAL" | "POLICY_VIOLATION" | "MISSED_KPIS";
    description: string;
  }[];
  evidence: string;
  areasOfConcern: string[];
  goals: { title: string; description?: string; successCriteria: string; deadline: string }[];
  startDate: string;
  endDate: string;
  reviewFrequency: "WEEKLY" | "BI_WEEKLY" | "MONTHLY";
  reviewMethod: string;
  expectedImprovement: string;
  consequencesIfNotMet: string;
  mentorId?: string | null;
  monitoringPeriodDays?: MonitoringPeriodDays;
  linkedAppraisalId?: number | null;
  counselingNotes?: string;
  counselingDate?: string | null;
}

export function useCreatePIP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePIPInput) => apiClient.post<PIP>("/hr/performance/pip", data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: pipKeys.list() }),
  });
}

export interface UpdatePIPInput {
  id: number;
  status?: "DRAFT" | "ACTIVE" | "EXTENDED" | "COMPLETED" | "TERMINATED";
  outcome?: string;
  notes?: string;
  startDate?: string;
  endDate?: string;
  finalOutcome?: "SUCCESS" | "EXTENDED" | "FAILED";
  managementDecision?: PipManagementDecision;
  reasons?: {
    category: "POOR_PERFORMANCE" | "BEHAVIORAL" | "POLICY_VIOLATION" | "MISSED_KPIS";
    description: string;
  }[];
  evidence?: string;
  areasOfConcern?: string[];
  reviewFrequency?: "WEEKLY" | "BI_WEEKLY" | "MONTHLY";
  reviewMethod?: string;
  expectedImprovement?: string;
  consequencesIfNotMet?: string;
  phase?: PipPhase;
  monitoringPeriodDays?: MonitoringPeriodDays;
  counselingNotes?: string;
  counselingDate?: string | null;
  sufficientEvidence?: boolean;
  performanceImprovedCounseling?: boolean;
  midpointAssessmentNotes?: string;
  midpointOnTrack?: boolean;
}

export function useUpdatePIP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePIPInput) => {
      const { id, ...body } = input;
      return apiClient.patch<PIP>(`/hr/performance/pip/${id}`, body);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: pipKeys.list() });
      void qc.invalidateQueries({ queryKey: [...pipKeys.all, "detail", vars.id] });
    },
  });
}

export function useAcknowledgePIP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; data: { acknowledged: true; comment?: string } }) =>
      apiClient.post<PIP>(`/hr/performance/pip/${input.id}/acknowledge`, input.data),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: pipKeys.list() });
      void qc.invalidateQueries({ queryKey: [...pipKeys.all, "detail", vars.id] });
    },
  });
}

export function useCreatePIPCheckIn(pipId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post<unknown>(`/hr/performance/pip/${pipId}/check-ins`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pipKeys.list() });
      void qc.invalidateQueries({ queryKey: [...pipKeys.all, "detail", pipId] });
    },
  });
}

export function useAddPIPDocument(pipId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { docType: PipDocType; title: string; content: string }) =>
      apiClient.post<PIPDocument>(`/hr/performance/pip/${pipId}/documents`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pipKeys.documents(pipId) });
    },
  });
}
