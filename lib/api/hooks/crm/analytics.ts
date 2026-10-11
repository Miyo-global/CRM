"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { SupportDashboard } from "@/types/crm";

export function useSupportDashboard() {
  return useQuery({
    queryKey: queryKeys.crm.supportDashboard(),
    queryFn: () => apiClient.get<SupportDashboard>("/crm/support-dashboard"),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });
}
