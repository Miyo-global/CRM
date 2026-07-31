"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface SalaryLoan {
  id: number;
  userId: string;
  amount: string;
  reason: string | null;
  emiAmount: string | null;
  totalEmis: number | null;
  paidEmis: number | null;
  status: "PENDING" | "APPROVED" | "ACTIVE" | "REPAID" | "REJECTED" | null;
  approvedBy: string | null;
  disbursedAt: Date | string | null;
  createdAt: Date | string | null;
  user?: { id: string; name: string | null; email: string } | null;
}

const loanKeys = {
  all: [...queryKeys.hr.all, "loans"] as const,
  list: () => [...loanKeys.all, "list"] as const,
};

export function useSalaryLoans() {
  return useQuery({
    queryKey: loanKeys.list(),
    queryFn: () => apiClient.get<SalaryLoan[]>("/hr/loans"),
  });
}

export function useCreateSalaryLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; reason: string; totalEmis?: number }) =>
      apiClient.post<SalaryLoan>("/hr/loans", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: loanKeys.list() }),
  });
}

export function useProcessSalaryLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; status?: string; paidEmis?: number }) =>
      apiClient.patch<{ success: boolean }>(`/hr/loans/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: loanKeys.list() }),
  });
}
