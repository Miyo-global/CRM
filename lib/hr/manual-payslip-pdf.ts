import { format } from "date-fns";
import { z } from "zod";
import type { PayslipPdfData } from "@/lib/payslip-pdf-core";
import type { PayslipMoneyLine } from "@/lib/hr/payslip-view-model";
import { toWordsInr } from "@/lib/hr/payslip-view-model";

export const manualPayslipPdfBodySchema = z
  .object({
    month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    monthLabel: z.string().min(1).optional(),
    orgName: z.string().min(1),
    orgShortName: z.string().min(1).optional(),
    orgAddress: z.string().optional(),
    employeeName: z.string().min(1),
    employeeId: z.string().optional(),
    designation: z.string().optional(),
    department: z.string().optional(),
    panNumber: z.string().optional(),
    bankName: z.string().optional(),
    bankAccountDisplay: z.string().optional(),
    bankBranch: z.string().optional(),
    ifsc: z.string().optional(),
    joiningDateDisplay: z.string().optional(),
    basicSalary: z.number().nonnegative(),
    hra: z.number().nonnegative(),
    allowances: z.number().nonnegative().optional().default(0),
    overtimeAmount: z.number().nonnegative().optional().default(0),
    overtimeType: z.enum(["days", "hours"]).nullable().optional(),
    overtimeDays: z.number().nonnegative().optional(),
    overtimeHours: z.number().nonnegative().optional(),
    calendarDaysInMonth: z.number().int().positive().optional(),
    lopDays: z.number().nonnegative().optional().default(0),
    leaveDaysInMonth: z.number().nonnegative().optional().default(0),
    lopDeductionAmount: z.number().nonnegative().optional().default(0),
    advanceRecoveryAmount: z.number().nonnegative().optional().default(0),
    professionalTax: z.number().nonnegative().optional().default(200),
    pfEmployee: z.number().nonnegative().optional().default(0),
    esiEmployee: z.number().nonnegative().optional().default(0),
    grossSalary: z.number().nonnegative(),
    deductions: z.number().nonnegative(),
    netSalary: z.number().nonnegative(),
    showPaidBadge: z.boolean().optional().default(true),
  })
  .refine((d) => Boolean(d.month ?? d.monthLabel), {
    message: "Provide month (YYYY-MM) or monthLabel",
    path: ["month"],
  });

export type ManualPayslipPdfBody = z.infer<typeof manualPayslipPdfBodySchema>;

export function manualPayslipBodyToPdfData(body: ManualPayslipPdfBody): PayslipPdfData {
  const monthLabel =
    body.monthLabel ??
    (body.month ? format(new Date(body.month + "-01"), "MMMM yyyy") : "Unknown Month");

  let calendarDays = body.calendarDaysInMonth;
  if (calendarDays == null && body.month) {
    const [yr, mo] = body.month.split("-").map(Number);
    calendarDays = new Date(yr, mo, 0).getDate();
  }
  const daysInPayMonth = calendarDays ?? 30;

  const earnings: PayslipMoneyLine[] = [{ label: "Basic Pay", amount: body.basicSalary }];
  if (body.hra > 0) earnings.push({ label: "House Rent Allowance", amount: body.hra });
  if (body.allowances > 0) earnings.push({ label: "Special Allowance", amount: body.allowances });
  if (body.overtimeAmount > 0) {
    const otHoursVal = body.overtimeHours ?? 0;
    const otDaysVal = body.overtimeDays ?? 0;
    let otLabel = "Overtime Pay";
    if (body.overtimeType === "hours" || (!body.overtimeType && otHoursVal > 0)) {
      otLabel = `Overtime Pay (${otHoursVal} ${otHoursVal === 1 ? "hour" : "hours"})`;
    } else if (body.overtimeType === "days" || (!body.overtimeType && otDaysVal > 0)) {
      otLabel = `Overtime Pay (${otDaysVal} ${otDaysVal === 1 ? "day" : "days"})`;
    }
    earnings.push({ label: otLabel, amount: body.overtimeAmount });
  }

  const deductions: PayslipMoneyLine[] = [];
  const pt = body.professionalTax;
  if (pt > 0) deductions.push({ label: "Professional Tax", amount: pt });
  if (body.pfEmployee > 0) deductions.push({ label: "Provident Fund (PF)", amount: body.pfEmployee });
  if (body.esiEmployee > 0) deductions.push({ label: "Employee State Insurance (ESI)", amount: body.esiEmployee });
  const lopD = body.lopDeductionAmount;
  if (lopD > 0)
    deductions.push({
      label: `Loss of Pay (${body.lopDays} day${body.lopDays === 1 ? "" : "s"})`,
      amount: lopD,
    });
  const adv = body.advanceRecoveryAmount;
  if (adv > 0) deductions.push({ label: "Advance Recovery", amount: adv });
  const otherDed = Math.max(0, body.deductions - pt - body.pfEmployee - body.esiEmployee - lopD - adv);
  if (otherDed > 0.5) deductions.push({ label: "Other Deductions", amount: otherDed });

  return {
    monthLabel,
    orgFullName: body.orgName,
    orgShortName: body.orgShortName ?? body.orgName,
    orgAddressLine: body.orgAddress,
    showPaidBadge: body.showPaidBadge,
    employeeName: body.employeeName,
    designation: body.designation ?? "",
    employeeId: body.employeeId ?? "",
    bankName: body.bankName ?? "",
    bankAccountDisplay: body.bankAccountDisplay ?? "",
    joiningDateDisplay: body.joiningDateDisplay ?? "",
    daysInPayMonth,
    pan: body.panNumber ?? "",
    lopDays: body.lopDays,
    leaveDays: body.leaveDaysInMonth,
    earnings,
    deductions,
    grossSalary: body.grossSalary,
    totalDeductions: body.deductions,
    netSalary: body.netSalary,
    netInWords: toWordsInr(body.netSalary),
    bankIfsc: body.ifsc ?? "",
    bankBranch: body.bankBranch ?? "",
    generatedAt: new Date(),
  };
}
