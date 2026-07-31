import { format } from "date-fns";

export type PayslipMoneyLine = { label: string; amount: number };

export type PayslipViewModel = {
  monthLabel: string;
  orgFullName: string;
  orgShortName: string;
  orgAddressLine?: string;
  showPaidBadge: boolean;
  employeeName: string;
  designation: string;
  employeeId: string;
  bankName: string;
  bankAccountDisplay: string;
  joiningDateDisplay: string;
  daysInPayMonth: number;
  pan: string;
  lopDays: number;
  leaveDays: number;
  earnings: PayslipMoneyLine[];
  deductions: PayslipMoneyLine[];
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  netInWords: string;
  bankIfsc: string;
  bankBranch: string;
  generatedAt: Date;
};

export function fmtInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function toWordsInr(n: number): string {
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  if (n === 0) return "Zero Rupees Only";
  function helper(num: number): string {
    if (num < 20) return a[num] ?? "";
    if (num < 100)
      return (b[Math.floor(num / 10)] ?? "") + (num % 10 ? " " + (a[num % 10] ?? "") : "");
    if (num < 1000)
      return (a[Math.floor(num / 100)] ?? "") + " Hundred" + (num % 100 ? " " + helper(num % 100) : "");
    if (num < 100000)
      return helper(Math.floor(num / 1000)) + " Thousand" + (num % 1000 ? " " + helper(num % 1000) : "");
    if (num < 10000000)
      return helper(Math.floor(num / 100000)) + " Lakh" + (num % 100000 ? " " + helper(num % 100000) : "");
    return helper(Math.floor(num / 10000000)) + " Crore" + (num % 10000000 ? " " + helper(num % 10000000) : "");
  }
  return helper(Math.floor(n)) + " Rupees Only";
}

type PayrollLike = {
  month: string | null;
  basicSalary: string | null;
  hra: string | null;
  specialAllowance?: string | null;
  allowances: string | null;
  overtimeType: string | null;
  overtimeDays: string | null;
  overtimeHours: string | null;
  overtimeAmount: string | null;
  grossSalary: string | null;
  deductions: string | null;
  netSalary: string | null;
  ptAmount: string | null;
  lopDays: string | null;
  halfDays: string | null;
  lopAmount?: string | null;
  halfDayAmount?: string | null;
  advanceRecoveryAmount?: string | null;
  otherDeductions?: string | null;
  structureDeductions?: string | null;
  pfEmployee?: string | null;
  esiEmployee?: string | null;
};

type UserLike = {
  name: string | null;
  employeeId: string | null;
  designation: string | null;
  joiningDate: Date | string | null;
  taxId: string | null;
  bankDetails?: {
    accountNumber?: string | null;
    bankName?: string | null;
    ifsc?: string | null;
    branch?: string | null;
  } | null;
};

type OrgLike = {
  name: string | null;
  address?: { city?: string | null; state?: string | null; country?: string | null } | null;
};

export type BuildPayslipViewModelOptions = {
  leaveDaysInMonth?: number;
  showPaidBadge?: boolean;
  orgFullNameOverride?: string;
};

export function buildPayslipViewModelFromPayroll(
  payroll: PayrollLike,
  employee: UserLike,
  org: OrgLike,
  opts?: BuildPayslipViewModelOptions
): PayslipViewModel {
  const monthLabel = payroll.month
    ? format(new Date(payroll.month + "-01"), "MMMM yyyy")
    : "Unknown Month";

  const daysInPayMonth = payroll.month
    ? (() => {
        const [yr, mo] = payroll.month.split("-").map(Number);
        return new Date(yr, mo, 0).getDate();
      })()
    : 30;

  const basic = parseFloat(payroll.basicSalary || "0");
  const hra = parseFloat(payroll.hra || "0");
  const specialAllowance = parseFloat(payroll.specialAllowance ?? "0");
  const bonus = parseFloat(payroll.allowances || "0");
  const overtime = parseFloat(payroll.overtimeAmount || "0");
  const gross = parseFloat(payroll.grossSalary || "0");
  const lopAmount = parseFloat(payroll.lopAmount ?? "0");
  const lopDays = parseFloat(payroll.lopDays ?? "0");
  const ptAmount = parseFloat(payroll.ptAmount ?? "200");
  const pfEmployee = parseFloat(payroll.pfEmployee ?? "0");
  const esiEmployee = parseFloat(payroll.esiEmployee ?? "0");
  const advanceRecovery = parseFloat(payroll.advanceRecoveryAmount ?? "0");
  const otherDeductions = parseFloat(payroll.otherDeductions ?? "0");
  const structureDeductions = parseFloat(payroll.structureDeductions ?? "0");
  const totalDeductions = parseFloat(payroll.deductions ?? "0");
  const net = parseFloat(payroll.netSalary || "0");

  const earnings: PayslipMoneyLine[] = [];
  earnings.push({ label: "Basic Pay", amount: basic });
  if (hra > 0) earnings.push({ label: "House Rent Allowance", amount: hra });
  if (specialAllowance > 0) earnings.push({ label: "Special Allowance", amount: specialAllowance });
  if (bonus > 0) earnings.push({ label: "Bonus / Incentive", amount: bonus });
  if (overtime > 0) {
    const otDaysVal = parseFloat(payroll.overtimeDays ?? "0");
    const otHoursVal = parseFloat(payroll.overtimeHours ?? "0");
    let otLabel = "Overtime Pay";
    if (payroll.overtimeType === "hours" || (!payroll.overtimeType && otHoursVal > 0)) {
      otLabel = `Overtime Pay (${otHoursVal} ${otHoursVal === 1 ? "hour" : "hours"})`;
    } else if (payroll.overtimeType === "days" || (!payroll.overtimeType && otDaysVal > 0)) {
      otLabel = `Overtime Pay (${otDaysVal} ${otDaysVal === 1 ? "day" : "days"})`;
    }
    earnings.push({ label: otLabel, amount: overtime });
  }

  const deductions: PayslipMoneyLine[] = [];
  if (ptAmount > 0) deductions.push({ label: "Professional Tax", amount: ptAmount });
  if (pfEmployee > 0) deductions.push({ label: "Provident Fund (PF)", amount: pfEmployee });
  if (esiEmployee > 0) deductions.push({ label: "Employee State Insurance (ESI)", amount: esiEmployee });
  if (lopAmount > 0)
    deductions.push({
      label: `Loss of Pay (${lopDays} day${lopDays === 1 ? "" : "s"})`,
      amount: lopAmount,
    });
  if (advanceRecovery > 0) deductions.push({ label: "Advance Recovery", amount: advanceRecovery });
  if (structureDeductions > 0) deductions.push({ label: "Recurring Deductions", amount: structureDeductions });
  if (otherDeductions > 0) deductions.push({ label: "Other Deductions", amount: otherDeductions });

  const bank = employee.bankDetails;
  const orgAddress = org?.address;
  const addressLine = [orgAddress?.city, orgAddress?.state, orgAddress?.country].filter(Boolean).join(", ");

  return {
    monthLabel,
    orgFullName: opts?.orgFullNameOverride ?? org?.name ?? "Miyo Global",
    orgShortName: org?.name ?? "Miyo Global",
    orgAddressLine: addressLine || undefined,
    showPaidBadge: opts?.showPaidBadge ?? true,
    employeeName: employee.name ?? "Employee",
    designation: employee.designation ?? "",
    employeeId: employee.employeeId ?? "",
    bankName: bank?.bankName ?? "",
    bankAccountDisplay: bank?.accountNumber ? String(bank.accountNumber).trim() : "",
    joiningDateDisplay: employee.joiningDate
      ? format(new Date(employee.joiningDate), "dd-MM-yyyy")
      : "",
    daysInPayMonth,
    pan: employee.taxId ?? "",
    lopDays,
    leaveDays: opts?.leaveDaysInMonth ?? 0,
    earnings,
    deductions,
    grossSalary: gross,
    totalDeductions,
    netSalary: net,
    netInWords: toWordsInr(net),
    bankIfsc: bank?.ifsc ?? "",
    bankBranch: bank?.branch ?? "",
    generatedAt: new Date(),
  };
}
