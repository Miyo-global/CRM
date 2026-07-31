"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface PolicyAcknowledgment {
  id: number;
  documentId: number;
  userId: string;
  status: "PENDING" | "ACKNOWLEDGED" | "DECLINED" | null;
  acknowledgedAt: Date | string | null;
  createdAt: Date | string | null;
  document?: { id: number; name: string; type: string } | null;
  user?: { id: string; name: string | null; email: string } | null;
}

const complianceKeys = {
  all: [...queryKeys.hr.all, "compliance"] as const,
  list: () => [...complianceKeys.all, "list"] as const,
};

export function usePolicyAcknowledgments() {
  return useQuery({
    queryKey: complianceKeys.list(),
    queryFn: () => apiClient.get<PolicyAcknowledgment[]>("/hr/compliance"),
  });
}

export function useSendPolicyAck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { documentId: number; userIds: string[] }) =>
      apiClient.post<{ success: boolean; sent: number }>("/hr/compliance", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: complianceKeys.list() }),
  });
}

export function useAcknowledgePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { acknowledgmentId: number; status: "ACKNOWLEDGED" | "DECLINED" }) =>
      apiClient.patch<{ success: boolean }>("/hr/compliance", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: complianceKeys.list() }),
  });
}
