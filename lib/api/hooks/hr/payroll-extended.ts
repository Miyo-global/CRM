"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";


export function useSalaryRevisionHistory(userId: string) {
  return useQuery({
    queryKey: queryKeys.hr.salaryRevisionHistory(userId),
    queryFn: () =>
      apiClient.get<SalaryRevision[]>(`/hr/salary-structures/${userId}/history`),
    enabled: !!userId,
  });
}

export interface SalaryRevision {
  id: number;
  userId: string;
  previousBasicSalary: string | null;
  newBasicSalary: string;
  previousHraPercentage: string | null;
  newHraPercentage: string;
  previousSpecialAllowance: string | null;
  newSpecialAllowance: string;
  reason: string | null;
  revisedBy: string;
  createdAt: string;
  revisedByUser?: { id: string; name: string | null } | null;
}

export function useReviseSalary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, ...data }: { userId: string; basicSalary: number; hraPercentage?: number; specialAllowance?: number; reason?: string }) =>
      apiClient.post<{ success: boolean }>(`/hr/salary-structures/${userId}/revise`, data),
    onSuccess: (_r, v) => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.salaryStructures(v.userId) });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.salaryRevisionHistory(v.userId) });
    },
  });
}


export interface HolidayWorkRequest {
  id: number;
  orgId: string;
  userId: string;
  requestDate: string;
  type: "HOLIDAY" | "SUNDAY" | "SATURDAY";
  reason: string | null;
  compensationPreference: "COMP_OFF" | "EXTRA_PAY";
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  user?: { id: string; name: string | null } | null;
  approvedByUser?: { id: string; name: string | null } | null;
}

export function useHolidayWorkRequests(params?: { userId?: string; status?: string }) {
  return useQuery({
    queryKey: queryKeys.hr.holidayWorkRequests(params as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<HolidayWorkRequest[]>("/hr/holiday-work-requests", params as Record<string, unknown>),
  });
}

export function useSubmitHolidayWorkRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { requestDate: string; reason: string; compensationPreference: "COMP_OFF" | "EXTRA_PAY" }) =>
      apiClient.post<HolidayWorkRequest>("/hr/holiday-work-requests", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.holidayWorkRequests() }),
  });
}

export function useApproveHolidayWorkRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.patch<HolidayWorkRequest>(`/hr/holiday-work-requests/${id}/approve`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.holidayWorkRequests() }),
  });
}

export function useRejectHolidayWorkRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rejectionReason }: { id: number; rejectionReason: string }) =>
      apiClient.patch<HolidayWorkRequest>(`/hr/holiday-work-requests/${id}/reject`, { rejectionReason }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.holidayWorkRequests() }),
  });
}


export interface CompOffGrant {
  id: number;
  orgId: string;
  userId: string;
  holidayWorkRequestId: number;
  grantedDays: string;
  usedDays: string;
  expiryDate: string;
  status: "ACTIVE" | "EXPIRED" | "USED";
  grantedBy: string;
  createdAt: string;
  holidayWorkRequest?: { id: number; requestDate: string; type: string; compensationPreference: string } | null;
  grantedByUser?: { id: string; name: string | null } | null;
}

export function useCompOffGrants(userId?: string) {
  return useQuery({
    queryKey: queryKeys.hr.compOffGrants(userId),
    queryFn: () =>
      apiClient.get<CompOffGrant[]>("/hr/comp-off-grants", userId ? { userId } : undefined),
  });
}

export function useGrantCompOff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { holidayWorkRequestId: number; grantedDays?: number }) =>
      apiClient.post<CompOffGrant>("/hr/comp-off-grants", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.compOffGrants() });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.leaveBalance() });
    },
  });
}


export interface LateArrivalWarning {
  id: number;
  orgId: string;
  userId: string;
  date: string;
  warningNumber: number;
  attendanceId: number | null;
  notedBy: string;
  createdAt: string;
  notedByUser?: { id: string; name: string | null } | null;
}

export function useLateArrivalWarnings(userId?: string) {
  return useQuery({
    queryKey: queryKeys.hr.lateArrivalWarnings(userId),
    queryFn: () =>
      apiClient.get<LateArrivalWarning[]>("/hr/late-arrival-warnings", userId ? { userId } : undefined),
  });
}

export function useLogLateArrivalWarning() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string; date: string; attendanceId?: number }) =>
      apiClient.post<LateArrivalWarning>("/hr/late-arrival-warnings", data),
    onSuccess: (_r, v) =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.lateArrivalWarnings(v.userId) }),
  });
}


export interface OvertimePreview {
  userId: string;
  month: string;
  overtimeDays: number;
  overtimeAmount: number;
  dailyRate: number;
  eligibleDates: string[];
  lopDays: number;
  paidLeaveDays: number;
  fullPresentDays: number;
  workingDays: number;
  holidayDays: number;
  weekendDays: number;
}

export function useOvertimePreview(params: { userId: string; month: string }) {
  return useQuery({
    queryKey: queryKeys.hr.overtimePreview(params),
    queryFn: () =>
      apiClient.get<OvertimePreview>("/hr/payrolls/overtime-preview", params as unknown as Record<string, unknown>),
    enabled: !!params.userId && !!params.month,
  });
}


export interface PayrollSchedule {
  id: number | null;
  frequency: "MONTHLY";
  dayOfMonth: number;
  isEnabled: boolean;
  autoApprove: boolean;
  lastRunPeriod: string | null;
  lastRunAt: string | null;
}

export interface UpdatePayrollScheduleInput {
  frequency: "MONTHLY";
  dayOfMonth: number;
  isEnabled: boolean;
  autoApprove: boolean;
}

const payrollScheduleQueryKey = ["hr", "payroll-schedule"] as const;

export function usePayrollSchedule() {
  return useQuery({
    queryKey: payrollScheduleQueryKey,
    queryFn: () => apiClient.get<PayrollSchedule>("/hr/payroll-schedules"),
  });
}

export function useUpdatePayrollSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePayrollScheduleInput) =>
      apiClient.put<PayrollSchedule>("/hr/payroll-schedules", data),
    onSuccess: (result) => {
      qc.setQueryData(payrollScheduleQueryKey, result);
      void qc.invalidateQueries({ queryKey: payrollScheduleQueryKey });
    },
  });
}


export interface GeneratePayslipWithPeriodInput {
  userId: string;
  month: string;
  bonus?: number;
  otherDeductions?: number;
  /** Optional custom pay period within the same calendar month (YYYY-MM-DD). */
  periodStart?: string;
  periodEnd?: string;
}

/**
 * Single-employee payslip generation that also accepts an optional custom pay
 * period (start/end within the selected month). The full-month flow is the
 * default; passing periodStart/periodEnd caps the attendance window.
 */
export function useGeneratePayslipWithPeriod() {
  return useMutation({
    mutationFn: (data: GeneratePayslipWithPeriodInput) =>
      apiClient.post<{ success: boolean; payrollId?: number }>(
        "/hr/payrolls/generate",
        data,
      ),
  });
}
