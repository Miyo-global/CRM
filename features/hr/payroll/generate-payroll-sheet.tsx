"use client";

import { Input } from "@/components/ui/input";
import { EmployeeAssignCombobox } from "@/components/hr/employee-assign-combobox";
import { Separator } from "@/components/ui/separator";
import { HrSheet } from "@/features/hr/hr-sheet";
import type { Employee } from "@/types/hr";
import { PayslipDetailSheet, type PayslipPreview } from "./payslip-detail-sheet";
import type { OvertimePreview } from "@/lib/api/hooks/hr/payroll-extended";
import {
  blockNonDigitKey,
  sanitizeDigitsOnly,
} from "@/lib/numeric-input";
import { format } from "date-fns";

const nonNegativeInputProps = {
  type: "text" as const,
  inputMode: "numeric" as const,
  pattern: "[0-9]*",
  autoComplete: "off",
  onKeyDown: blockNonDigitKey,
};

export type PayrollPeriodMode = "month" | "custom";

interface GeneratePayrollSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  selectedEmployee: string;
  onSelectedEmployeeChange: (value: string) => void;
  showPreview: boolean;
  onShowPreview: () => void;
  onBackToEdit: () => void;
  bonus: string;
  onBonusChange: (value: string) => void;
  otherDeductions: string;
  onOtherDeductionsChange: (value: string) => void;
  overtimePreview: OvertimePreview | null | undefined;
  payslipPreview: PayslipPreview | null;
  selectedEmployeeData: Employee | null;
  selectedMonth: string;
  periodMode: PayrollPeriodMode;
  onPeriodModeChange: (mode: PayrollPeriodMode) => void;
  periodStart: string;
  onPeriodStartChange: (value: string) => void;
  periodEnd: string;
  onPeriodEndChange: (value: string) => void;
  onConfirmGenerate: () => void;
  isGenerating: boolean;
}

export function GeneratePayrollSheet({
  open,
  onOpenChange,
  employees,
  selectedEmployee,
  onSelectedEmployeeChange,
  showPreview,
  onShowPreview,
  onBackToEdit,
  bonus,
  onBonusChange,
  otherDeductions,
  onOtherDeductionsChange,
  overtimePreview,
  payslipPreview,
  selectedEmployeeData,
  selectedMonth,
  periodMode,
  onPeriodModeChange,
  periodStart,
  onPeriodStartChange,
  periodEnd,
  onPeriodEndChange,
  onConfirmGenerate,
  isGenerating,
}: GeneratePayrollSheetProps) {
  const monthFirstDay = `${selectedMonth}-01`;
  const monthLastDay = (() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const last = new Date(y, m, 0).getDate();
    return `${selectedMonth}-${String(last).padStart(2, "0")}`;
  })();
  const customRangeValid =
    periodMode === "month" ||
    (!!periodStart &&
      !!periodEnd &&
      periodStart >= monthFirstDay &&
      periodEnd <= monthLastDay &&
      periodEnd >= periodStart);

  if (showPreview) {
    return (
      <PayslipDetailSheet
        open={open}
        onOpenChange={onOpenChange}
        payslipPreview={payslipPreview}
        selectedEmployeeData={selectedEmployeeData}
        selectedMonth={selectedMonth}
        onBackToEdit={onBackToEdit}
        onConfirmGenerate={onConfirmGenerate}
        isGenerating={isGenerating}
      />
    );
  }

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Generate Payslip"
      description="Select an employee and adjust attendance and bonus before previewing. Salary changes are ad hoc with no suggested increment; a new salary always takes effect from the 1st of a calendar month (see HR policy / OPEN_QUESTIONS.md)."
      onSubmit={onShowPreview}
      submitLabel="Preview Payslip"
      isPending={false}
      submitDisabled={!customRangeValid}
    >
      <div className="space-y-2 rounded-md border bg-muted/50 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">Pay Period</span>
          <div className="inline-flex rounded-md border bg-background p-0.5 text-xs">
            <button
              type="button"
              onClick={() => onPeriodModeChange("month")}
              className={`px-2.5 py-1 rounded-[5px] transition-colors ${periodMode === "month" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
            >
              Full month
            </button>
            <button
              type="button"
              onClick={() => onPeriodModeChange("custom")}
              className={`px-2.5 py-1 rounded-[5px] transition-colors ${periodMode === "custom" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
            >
              Custom range
            </button>
          </div>
        </div>

        {periodMode === "month" ? (
          <p className="text-sm font-semibold">{format(new Date(selectedMonth + "-01"), "MMMM yyyy")}</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">From</label>
                <Input
                  type="date"
                  value={periodStart}
                  min={monthFirstDay}
                  max={monthLastDay}
                  onChange={(e) => onPeriodStartChange(e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">To</label>
                <Input
                  type="date"
                  value={periodEnd}
                  min={periodStart || monthFirstDay}
                  max={monthLastDay}
                  onChange={(e) => onPeriodEndChange(e.target.value)}
                  className="h-8"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Custom periods must stay within {format(new Date(monthFirstDay), "MMMM yyyy")}. Attendance is counted only through the end date; days after it are not docked as loss of pay.
            </p>
            {!customRangeValid && (
              <p className="text-[11px] text-destructive">
                Pick a start and end date inside this month, with the end on or after the start.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Employee</label>
        <EmployeeAssignCombobox
          employees={employees.map((emp) => {
            const displayName =
              `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim() || emp.email || "Employee";
            const salaryValue = Number(emp.monthlySalary);
            const salary = (Number.isFinite(salaryValue) ? salaryValue : 0).toLocaleString("en-IN");
            return {
              id: emp.id,
              name: `${displayName} — ₹${salary}/month`,
            };
          })}
          value={selectedEmployee}
          onValueChange={onSelectedEmployeeChange}
          placeholder="Select employee"
          searchPlaceholder="Search employee…"
          ariaLabel="Select employee for payslip"
          showUnassigned={false}
        />
      </div>

      {selectedEmployeeData && (
        <>
          <Separator />

          <div className="space-y-2">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Attendance (auto-calculated)
            </p>
            {overtimePreview ? (
              <div className="rounded-lg border border-border bg-muted/40 p-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Present days</span>
                  <span className="font-medium">{overtimePreview.fullPresentDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Working days</span>
                  <span className="font-medium">{overtimePreview.workingDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid leave</span>
                  <span className="font-medium">{overtimePreview.paidLeaveDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Holidays</span>
                  <span className="font-medium">{overtimePreview.holidayDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">LOP days</span>
                  <span className="font-semibold text-destructive">{overtimePreview.lopDays}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Calculating attendance from check-ins…</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              LOP and leave are computed from attendance check-ins for {selectedMonth}. A working day is paid when the employee checked in; weekends and declared holidays are also paid.
            </p>
            {!overtimePreview && selectedEmployeeData && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                No attendance records found for this period. Preview shows full salary — LOP deductions will be ₹0.
              </p>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Additional Adjustments
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Bonus / Incentive (₹)</label>
                <Input
                  {...nonNegativeInputProps}
                  value={bonus}
                  onChange={(e) => onBonusChange(sanitizeDigitsOnly(e.target.value, 10))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Other Deductions (₹)</label>
                <Input
                  {...nonNegativeInputProps}
                  value={otherDeductions}
                  onChange={(e) => onOtherDeductionsChange(sanitizeDigitsOnly(e.target.value, 10))}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {overtimePreview != null && (
            <>
              <Separator />
              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1 text-sm">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Auto-Detected Overtime
                </p>
                {overtimePreview.overtimeDays > 0 ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Eligible days</span>
                      <span className="font-medium">{overtimePreview.overtimeDays}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Daily rate</span>
                      <span className="font-medium">₹{overtimePreview.dailyRate.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">OT amount</span>
                      <span className="font-semibold text-green-700">+₹{overtimePreview.overtimeAmount.toLocaleString("en-IN")}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground pt-1">
                      Dates: {overtimePreview.eligibleDates.join(", ")}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground text-xs">No approved holiday/Sunday work with extra pay found for this month.</p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </HrSheet>
  );
}
