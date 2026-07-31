"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface Certification {
  id: number;
  userId: string;
  name: string;
  issuingOrganization: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
  documentUrl: string | null;
  createdAt: Date | string | null;
  user?: { id: string; name: string | null } | null;
}

const certKeys = {
  all: [...queryKeys.hr.all, "certifications"] as const,
  list: (params?: Record<string, unknown>) => [...certKeys.all, "list", params] as const,
};

export function useCertifications(params?: { userId?: string; expiringSoon?: boolean }) {
  return useQuery({
    queryKey: certKeys.list(params as Record<string, unknown> | undefined),
    queryFn: () => apiClient.get<Certification[]>("/hr/certifications", params as Record<string, unknown> | undefined),
  });
}

export function useCreateCertification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string; userId?: string; issuingOrganization?: string;
      issueDate?: string; expiryDate?: string; credentialId?: string;
      credentialUrl?: string; documentUrl?: string;
    }) => apiClient.post<Certification>("/hr/certifications", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: certKeys.all }),
  });
}
