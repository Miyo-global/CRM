"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface AuditLogRow {
  id: number;
  action: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  targetId: string | null;
  targetType: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date;
}

interface AuditLogListResponse {
  logs: AuditLogRow[];
  total: number;
  page: number;
  totalPages: number;
}

interface AuditLogFilters {
  page?: number;
  pageSize?: number;
  action?: string;
  targetType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const useAuditLogs = (
  filters?: AuditLogFilters,
  options?: Omit<
    UseQueryOptions<AuditLogListResponse, Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<AuditLogListResponse, Error>({
    queryKey: queryKeys.auditLog.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<AuditLogListResponse>("/audit-log", {
        ...(filters?.page ? { page: String(filters.page) } : {}),
        ...(filters?.pageSize ? { pageSize: String(filters.pageSize) } : {}),
        ...(filters?.action ? { action: filters.action } : {}),
        ...(filters?.targetType ? { targetType: filters.targetType } : {}),
        ...(filters?.dateFrom ? { dateFrom: filters.dateFrom } : {}),
        ...(filters?.dateTo ? { dateTo: filters.dateTo } : {}),
      }),
    ...options,
  });
};

export const useAuditLogActions = (
  options?: Omit<UseQueryOptions<string[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery<string[], Error>({
    queryKey: queryKeys.auditLog.actions(),
    queryFn: () => apiClient.get<string[]>("/audit-log/actions"),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
};

export const useAuditLogTargetTypes = (
  options?: Omit<UseQueryOptions<string[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery<string[], Error>({
    queryKey: queryKeys.auditLog.targetTypes(),
    queryFn: () => apiClient.get<string[]>("/audit-log/target-types"),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
};
