"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface TerminationEmployee {
  id: string;
  name: string | null;
  email: string;
  designation: string | null;
  employeeId: string | null;
}

export type TerminationStatus =
  | "DRAFT"
  | "PENDING_CEO"
  | "APPROVED"
  | "REJECTED"
  | "SENT"
  | "COMPLETED"
  | "CANCELLED";

export interface Termination {
  id: number;
  orgId: string;
  userId: string;
  status: TerminationStatus | null;
  reasons: string[] | null;
  detailedExplanation: string | null;
  effectiveDate: string | null;
  severanceAmount: string | null;
  noticePeriodWaived: boolean | null;
  terminationLetterUrl: string | null;
  supportingDocUrls: string[] | null;
  evidenceUrls: string[] | null;
  internalNotes: string | null;
  ceoRemarks: string | null;
  ceoReviewedBy: string | null;
  ceoReviewedAt: string | null;
  emailSentAt: string | null;
  emailStatus: string | null;
  initiatedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  employee?: TerminationEmployee;
  user?: { id: string; name: string | null; image: string | null; email: string; designation: string | null; joiningDate?: string | null } | null;
  initiator?: { id: string; name: string | null } | null;
  ceoReviewer?: { id: string; name: string | null } | null;
}

export interface CreateTerminationInput {
  userId: string;
  reasons: string[];
  detailedExplanation: string;
  effectiveDate: string;
  severanceAmount?: number;
  noticePeriodWaived?: boolean;
  internalNotes?: string;
  evidenceUrls?: string[];
}

const terminationKeys = {
  all: queryKeys.hr.terminations(),
  list: () => [...terminationKeys.all, "list"] as const,
  detail: (id: number) => [...terminationKeys.all, "detail", id] as const,
  letter: (id: number) => [...terminationKeys.all, "letter", id] as const,
};

export function useTerminations() {
  return useQuery({
    queryKey: terminationKeys.list(),
    queryFn: () => apiClient.get<Termination[]>("/hr/termination"),
  });
}

export function useTerminationDetail(id: number | null) {
  return useQuery({
    queryKey: terminationKeys.detail(id ?? 0),
    queryFn: () => apiClient.get<Termination>(`/hr/termination/${id}`),
    enabled: !!id,
  });
}

export function useTermination(id: number) {
  return useQuery({
    queryKey: terminationKeys.detail(id),
    queryFn: () => apiClient.get<Termination>(`/hr/termination/${id}`),
    enabled: id > 0,
  });
}

export function useTerminationLetter(id: number | null) {
  return useQuery({
    queryKey: terminationKeys.letter(id ?? 0),
    queryFn: () => apiClient.get<{ html: string }>(`/hr/termination/${id}/letter`),
    enabled: !!id,
  });
}

export function useCreateTermination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTerminationInput) =>
      apiClient.post<Termination>("/hr/termination", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: terminationKeys.all }),
  });
}

export function useSubmitTermination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.patch<{ success: boolean }>(`/hr/termination/${id}/submit`),
    // Awaited: the caller's toast fires once the card shows the new status (R3-ADM-04).
    onSuccess: () => qc.invalidateQueries({ queryKey: terminationKeys.all }),
  });
}

export function useCeoReviewTermination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      remarks,
    }: {
      id: number;
      decision: "approve" | "reject";
      remarks?: string;
    }) =>
      apiClient.patch<{ success: boolean }>(`/hr/termination/${id}/ceo-review`, {
        decision,
        remarks,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: terminationKeys.all }),
  });
}

export function useSendTerminationEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.post<{ success: boolean }>(`/hr/termination/${id}/send-email`, {}),
    // Awaited: the caller's toast fires once the card shows the new status (R3-ADM-04).
    onSuccess: () => qc.invalidateQueries({ queryKey: terminationKeys.all }),
  });
}

export function useCompleteTermination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.patch<{ success: boolean }>(`/hr/termination/${id}/complete`),
    // The whole HR cache: completion also changes the employee's status, the
    // directory and the terminated list.
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.all }),
  });
}

/** R3-ADM-07: edit a draft; every editable field is sent. */
export function useUpdateTermination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Omit<CreateTerminationInput, "userId"> & { id: number }) =>
      apiClient.patch<{ success: boolean; changed: string[] }>(`/hr/termination/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: terminationKeys.all }),
  });
}

export function useDeleteTermination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/hr/termination/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: terminationKeys.all }),
  });
}

export function useCancelTermination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      apiClient.patch<{ success: boolean }>(`/hr/termination/${id}/cancel`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: terminationKeys.all }),
  });
}
