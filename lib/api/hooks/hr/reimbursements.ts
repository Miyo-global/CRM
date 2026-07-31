"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface Reimbursement {
  id: number;
  userId: string;
  category: string;
  amount: string;
  description: string | null;
  receiptUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID" | null;
  approvedBy: string | null;
  rejectionReason: string | null;
  createdAt: Date | string | null;
  user?: { id: string; name: string | null; email: string } | null;
}

const reimbursementKeys = {
  all: [...queryKeys.hr.all, "reimbursements"] as const,
  list: () => [...reimbursementKeys.all, "list"] as const,
};

export function useReimbursements() {
  return useQuery({
    queryKey: reimbursementKeys.list(),
    queryFn: () => apiClient.get<Reimbursement[]>("/hr/reimbursements"),
  });
}

export function useCreateReimbursement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { category: string; amount: number; description?: string; receiptUrl?: string }) =>
      apiClient.post<Reimbursement>("/hr/reimbursements", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: reimbursementKeys.list() }),
  });
}

export function useProcessReimbursement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; status: string; rejectionReason?: string }) =>
      apiClient.patch<{ success: boolean }>(`/hr/reimbursements/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: reimbursementKeys.list() }),
  });
}
