"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface EmailDeliveryRow {
  id: number;
  toAddress: string;
  subject: string;
  templateKey: string | null;
  status: "queued" | "sent" | "failed" | "bounced";
  providerMessageId: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EmailLogResponse {
  deliveries: EmailDeliveryRow[];
  total: number;
  page: number;
  totalPages: number;
}

export interface EmailLogFilters {
  page?: number;
  pageSize?: number;
  status?: string;
  q?: string;
}

export const useEmailLog = (filters: EmailLogFilters) =>
  useQuery<EmailLogResponse, Error>({
    queryKey: queryKeys.emailLog.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<EmailLogResponse>("/settings/email-log", {
        ...(filters.page ? { page: String(filters.page) } : {}),
        ...(filters.pageSize ? { pageSize: String(filters.pageSize) } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.q ? { q: filters.q } : {}),
      }),
  });
