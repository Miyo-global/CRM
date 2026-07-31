"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface Quote {
  id: number;
  orgId: string;
  dealId: number | null;
  clientId: number | null;
  quoteNumber: string;
  subject: string;
  description: string | null;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  currency: string;
  totalAmount: string;
  taxAmount: string;
  discountAmount: string;
  netAmount: string;
  validUntil: string;
  termsAndConditions: string | null;
  createdById: string;
  sentAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string | null; image: string | null } | null;
  deal?: { id: number; name: string } | null;
  client?: { id: number; clientName: string } | null;
  lineItems?: QuoteLineItem[];
}

export interface QuoteLineItem {
  id: number;
  quoteId: number;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  taxRate: string;
  displayOrder: number;
}

interface QuoteFilters {
  status?: string;
  dealId?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

interface CreateQuoteInput {
  dealId?: number;
  clientId?: number;
  subject: string;
  description?: string;
  currency?: string;
  validUntil: string;
  termsAndConditions?: string;
  notes?: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
  }>;
}

interface UpdateQuoteInput {
  id: number;
  subject?: string;
  description?: string;
  status?: Quote["status"];
  validUntil?: string;
  termsAndConditions?: string;
  notes?: string;
  rejectionReason?: string;
}

export function useQuotes(filters?: QuoteFilters) {
  return useQuery({
    queryKey: queryKeys.quotes.list(filters as Record<string, unknown>),
    queryFn: () => apiClient.get<{ quotes: Quote[]; total: number }>("/quotes", filters as Record<string, unknown>),
  });
}

export function useQuoteDetail(id: number) {
  return useQuery({
    queryKey: queryKeys.quotes.detail(id),
    queryFn: () => apiClient.get<Quote>(`/quotes/${id}`),
    enabled: id > 0,
  });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuoteInput) => apiClient.post<Quote>("/quotes", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quotes.all });
    },
  });
}

export function useUpdateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateQuoteInput) =>
      apiClient.patch<Quote>(`/quotes/${id}`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.quotes.all });
      qc.invalidateQueries({ queryKey: queryKeys.quotes.detail(vars.id) });
    },
  });
}

export function useDeleteQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/quotes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quotes.all });
    },
  });
}

export function useSendQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post<Quote>(`/quotes/${id}/send`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.quotes.all });
      qc.invalidateQueries({ queryKey: queryKeys.quotes.detail(id) });
    },
  });
}
