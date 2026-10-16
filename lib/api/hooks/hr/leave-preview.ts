"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface LeavePreview {
  requestedDays: number;
  available: number;
  balanceAfter: number | null;
  error: string | null;
  leaveTypeName: string | null;
}

/**
 * The server's own verdict on a draft leave request.
 *
 * The form used to preview from the balance alone and so promised days the
 * server then refused over the monthly casual cap (QA-0050).
 */
export function useLeavePreview(params: {
  leaveTypeId?: string;
  startDate?: string;
  endDate?: string;
  isHalfDay?: boolean;
}) {
  const { leaveTypeId, startDate, endDate, isHalfDay = false } = params;
  const enabled = Boolean(leaveTypeId && startDate && endDate);

  return useQuery<LeavePreview, Error>({
    queryKey: ["hr", "leaves", "preview", leaveTypeId, startDate, endDate, isHalfDay],
    enabled,
    staleTime: 15_000,
    queryFn: () =>
      apiClient.get<LeavePreview>("/hr/leaves/preview", {
        leaveTypeId: leaveTypeId!,
        startDate: startDate!,
        endDate: endDate!,
        isHalfDay: String(isHalfDay),
      }),
  });
}
