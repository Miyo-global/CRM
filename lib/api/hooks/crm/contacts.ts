"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Contact,
  PaginatedContacts,
  ContactFilters,
  ContactSearchResult,
  CreateContactInput,
  UpdateContactInput,
} from "@/types/crm";

export function useContacts(filters?: ContactFilters) {
  return useQuery({
    queryKey: queryKeys.contacts.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<PaginatedContacts>("/contacts", filters as Record<string, unknown>),
  });
}

export function useContactDetail(id: number) {
  return useQuery({
    queryKey: queryKeys.contacts.detail(id),
    queryFn: () => apiClient.get<Contact>(`/contacts/${id}`),
    enabled: id > 0,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateContactInput) =>
      apiClient.post<Contact>("/contacts", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateContactInput) =>
      apiClient.patch<Contact>(`/contacts/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.contacts.all });
      qc.invalidateQueries({ queryKey: queryKeys.contacts.detail(vars.id) });
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/contacts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
}

export function useContactSearch(q: string) {
  return useQuery({
    queryKey: ["contacts", "search", q],
    queryFn: () =>
      apiClient.get<ContactSearchResult[]>("/contacts/search", { q }),
    enabled: q.length >= 2,
    staleTime: 30_000,
  });
}
