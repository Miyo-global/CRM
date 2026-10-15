"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

/**
 * HR letter templates — employment, confirmation and experience letters for
 * existing employees. (The recruitment module, which also used these for
 * candidate offers, has been removed.)
 */
export interface OfferLetterTemplate {
  id: number;
  orgId: string;
  name: string;
  body: string;
  description: string | null;
  isDefault: boolean;
  variables: string[] | null;
  documentType: string;
  showSignatureBlock: boolean;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export function useOfferLetterTemplates() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "offer-letter-templates"] as const,
    queryFn: () => apiClient.get<OfferLetterTemplate[]>("/hr/offer-letter-templates"),
  });
}

export function useCreateOfferLetterTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      body: string;
      description?: string;
      isDefault?: boolean;
      variables?: string[];
      documentType?: string;
      showSignatureBlock?: boolean;
    }) => apiClient.post<OfferLetterTemplate>("/hr/offer-letter-templates", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "offer-letter-templates"] }),
  });
}

export function useUpdateOfferLetterTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: number;
      name?: string;
      body?: string;
      description?: string;
      isDefault?: boolean;
      variables?: string[];
      documentType?: string;
      showSignatureBlock?: boolean;
    }) => apiClient.patch<OfferLetterTemplate>(`/hr/offer-letter-templates/${id}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "offer-letter-templates"] }),
  });
}

export function useDeleteOfferLetterTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/offer-letter-templates/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "offer-letter-templates"] }),
  });
}

export function useGenerateEmployeeLetter(employeeId: string) {
  return useMutation({
    mutationFn: (data: {
      templateId: number;
      extraVars?: Record<string, string>;
      preview?: boolean;
    }) => apiClient.post<{ url: string; key: string }>(`/hr/employees/${employeeId}/letters`, data),
  });
}

export interface OfferLetterCustomVariable {
  id: number;
  orgId: string;
  variableKey: string;
  label: string;
  description: string | null;
  createdById: string | null;
  createdAt: string | null;
}

const offerLetterCustomVariablesKey = [
  ...queryKeys.hr.all,
  "offer-letter-custom-variables",
] as const;

export function useOfferLetterCustomVariables(enabled = true) {
  return useQuery({
    queryKey: offerLetterCustomVariablesKey,
    queryFn: () =>
      apiClient.get<OfferLetterCustomVariable[]>("/hr/offer-letter-custom-variables"),
    enabled,
  });
}

export function useCreateOfferLetterCustomVariable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { variableKey: string; label: string; description?: string }) =>
      apiClient.post<OfferLetterCustomVariable>("/hr/offer-letter-custom-variables", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: offerLetterCustomVariablesKey }),
  });
}

export function useUpdateOfferLetterCustomVariable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: number;
      variableKey?: string;
      label?: string;
      description?: string | null;
    }) =>
      apiClient.patch<OfferLetterCustomVariable>(
        `/hr/offer-letter-custom-variables/${id}`,
        data
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: offerLetterCustomVariablesKey }),
  });
}

export function useDeleteOfferLetterCustomVariable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/offer-letter-custom-variables/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: offerLetterCustomVariablesKey }),
  });
}
