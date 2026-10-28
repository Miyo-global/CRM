"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface Shift {
  id: number;
  name: string;
  /** "HH:MM:SS" */
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  isActive: boolean;
}

export interface ShiftAssignment {
  id: number;
  userId: string;
  shiftId: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  employeeName: string | null;
  employeeEmail: string;
  employeeCode: string | null;
}

export interface MyShift {
  id: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
}

export interface ShiftInput {
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
}

const shiftKeys = {
  all: [...queryKeys.hr.all, "shifts"] as const,
  list: () => [...shiftKeys.all, "list"] as const,
  mine: () => [...shiftKeys.all, "me"] as const,
};

export function useShifts() {
  return useQuery({
    queryKey: shiftKeys.list(),
    queryFn: () => apiClient.get<{ shifts: Shift[]; assignments: ShiftAssignment[] }>("/hr/shifts"),
  });
}

export function useMyShift() {
  return useQuery({
    queryKey: shiftKeys.mine(),
    queryFn: () => apiClient.get<MyShift | null>("/hr/shifts/me"),
  });
}

function useInvalidatingMutation<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: shiftKeys.all }),
  });
}

export function useCreateShift() {
  return useInvalidatingMutation((data: ShiftInput) => apiClient.post<Shift>("/hr/shifts", data));
}

export function useUpdateShift() {
  return useInvalidatingMutation(({ id, ...data }: Partial<ShiftInput> & { id: number; isActive?: boolean }) =>
    apiClient.patch<Shift>(`/hr/shifts/${id}`, data),
  );
}

export function useAssignShift() {
  return useInvalidatingMutation(
    (data: { userId: string; shiftId: number; effectiveFrom: string; effectiveTo?: string | null }) =>
      apiClient.post<ShiftAssignment>("/hr/shifts/assignments", data),
  );
}

export function useRemoveShiftAssignment() {
  return useInvalidatingMutation((id: number) =>
    apiClient.delete<{ success: boolean }>(`/hr/shifts/assignments/${id}`),
  );
}
