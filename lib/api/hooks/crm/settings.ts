"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface CustomFieldDefinition {
  id: number;
  orgId: string;
  entityType: "lead" | "deal" | "contact";
  name: string;
  label: string;
  fieldType: "text" | "number" | "date" | "boolean" | "select";
  options: Array<{ value: string; label: string }> | null;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export function useCustomFields(entityType: "lead" | "deal" | "contact") {
  return useQuery({
    queryKey: ["custom-fields", entityType] as const,
    queryFn: () =>
      apiClient.get<{ fields: CustomFieldDefinition[] }>(
        `/settings/custom-fields?entityType=${entityType}`
      ),
  });
}

export interface CreateCustomFieldInput {
  entityType: "lead" | "deal" | "contact";
  name: string;
  label: string;
  fieldType: "text" | "number" | "date" | "boolean" | "select";
  options?: Array<{ value: string; label: string }>;
  isRequired?: boolean;
  sortOrder?: number;
}

export function useCreateCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCustomFieldInput) =>
      apiClient.post<{ field: CustomFieldDefinition }>("/settings/custom-fields", input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["custom-fields", vars.entityType] });
    },
  });
}

export interface UpdateCustomFieldInput {
  id: number;
  entityType: "lead" | "deal" | "contact";
  label?: string;
  options?: Array<{ value: string; label: string }> | null;
  isRequired?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

export function useUpdateCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, entityType: _et, ...data }: UpdateCustomFieldInput) =>
      apiClient.patch<{ field: CustomFieldDefinition }>(`/settings/custom-fields/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["custom-fields", vars.entityType] });
    },
  });
}

export function useDeleteCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, entityType: _et }: { id: number; entityType: "lead" | "deal" | "contact" }) =>
      apiClient.delete<{ success: boolean }>(`/settings/custom-fields/${id}`),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["custom-fields", vars.entityType] });
    },
  });
}

