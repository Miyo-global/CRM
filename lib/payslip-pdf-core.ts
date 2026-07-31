import type { PayslipViewModel } from "@/lib/hr/payslip-view-model";
import { buildPayslipViewModelFromPayroll } from "@/lib/hr/payslip-view-model";
import { renderBrandedPayslipPdf } from "@/lib/hr/payslip-branded-pdf";

export type PayslipPdfData = PayslipViewModel;

export type BuildPayslipPdfOptions = {
  leaveDaysInMonth?: number;
  showPaidBadge?: boolean;
  orgFullNameOverride?: string;
};

type PayrollLike = Parameters<typeof buildPayslipViewModelFromPayroll>[0];
type UserLike = Parameters<typeof buildPayslipViewModelFromPayroll>[1];
type OrgLike = Parameters<typeof buildPayslipViewModelFromPayroll>[2];

export function buildPayslipPdfDataFromPayroll(
  payroll: PayrollLike,
  employee: UserLike,
  org: OrgLike,
  opts?: BuildPayslipPdfOptions
): PayslipPdfData {
  return buildPayslipViewModelFromPayroll(payroll, employee, org, {
    leaveDaysInMonth: opts?.leaveDaysInMonth,
    showPaidBadge: opts?.showPaidBadge,
    orgFullNameOverride: opts?.orgFullNameOverride,
  });
}

export async function generatePayslipPdf(data: PayslipPdfData): Promise<Buffer> {
  return renderBrandedPayslipPdf(data);
}

export type { PayslipViewModel } from "@/lib/hr/payslip-view-model";
