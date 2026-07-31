"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Payroll,
  PayrollWithUser,
  SalaryStructure,
  EmployeePayslip,
  GeneratePayrollInput,
  CreateSalaryStructureInput,
  GetEmployeePayslipsInput,
  GetAllPayrollsInput,
  GenerateEmployeePayslipInput,
  ApprovePayrollInput,
  MarkPayrollPaidInput,
  DeletePayrollInput,
} from "@/types/hr";

export function useHrPayrolls() {
  return useQuery({
    queryKey: queryKeys.hr.payrolls(),
    queryFn: () => apiClient.get<Payroll[]>("/hr/payrolls"),
  });
}

export function useGeneratePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GeneratePayrollInput) =>
      apiClient.post<{ generated: number }>("/hr/payrolls", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.payrolls() }),
  });
}

export function useHrSalaryStructures(userId?: string) {
  return useQuery({
    queryKey: queryKeys.hr.salaryStructures(userId),
    queryFn: () =>
      apiClient.get<SalaryStructure[]>("/hr/salary-structures", userId ? { userId } : undefined),
    enabled: true,
  });
}

export function useCreateSalaryStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSalaryStructureInput) =>
      apiClient.post<SalaryStructure>("/hr/salary-structures", data),
    onSuccess: (_result, variables) =>
      qc.invalidateQueries({
        queryKey: queryKeys.hr.salaryStructures(variables.userId),
      }),
  });
}

export function useHrEmployeePayslips(params?: GetEmployeePayslipsInput) {
  return useQuery({
    queryKey: queryKeys.hr.employeePayslips(params?.userId),
    queryFn: () =>
      apiClient.get<EmployeePayslip[]>(
        "/hr/payslips",
        params as Record<string, unknown> | undefined
      ),
  });
}

export function useHrAllPayrolls(params: GetAllPayrollsInput) {
  return useQuery({
    queryKey: queryKeys.hr.payrolls({ month: params.month }),
    queryFn: () =>
      apiClient.get<PayrollWithUser[]>("/hr/payrolls/all", params as unknown as Record<string, unknown>),
  });
}

export function useGenerateEmployeePayslip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GenerateEmployeePayslipInput) =>
      apiClient.post<{ success: boolean }>("/hr/payrolls/generate", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.payrolls() }),
  });
}

export function useApprovePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payrollId }: ApprovePayrollInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/payrolls/${payrollId}/approve`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.payrolls() }),
  });
}

export type MarkPayrollPaidResult = {
  success: boolean;
  emailSent: boolean;
  emailError?: "no_email" | "send_failed";
};

export function useMarkPayrollPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payrollId }: MarkPayrollPaidInput) =>
      apiClient.patch<MarkPayrollPaidResult>(`/hr/payrolls/${payrollId}/paid`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.payrolls() }),
  });
}

export function useResendPayslipEmail() {
  return useMutation({
    mutationFn: ({ payrollId }: { payrollId: number }) =>
      apiClient.post<MarkPayrollPaidResult>(`/hr/payrolls/${payrollId}/email-payslip`),
  });
}

export function useDeletePayroll() {
  return useMutation({
    mutationFn: ({ payrollId }: DeletePayrollInput) =>
      apiClient.delete<{ success: boolean }>(`/hr/payrolls/${payrollId}`),
  });
}
