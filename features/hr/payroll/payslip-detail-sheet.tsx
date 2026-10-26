"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calculator, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { format, getDaysInMonth } from "date-fns";
import { monthKeyToDate } from "@/lib/date-utils";
import { isoDateInTimezone } from "@/lib/constants/locale";
import { HrSheet } from "@/features/hr/hr-sheet";
import type { Employee } from "@/types/hr";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";
import { fmtInr } from "@/lib/hr/payslip-view-model";

export interface PayslipPreview {
  basicPay: number;
  hra: number;
  allowances: number;
  grossSalary: number;
  lopDeduction: number;
  professionalTax: number;
  otherDeductions: number;
  bonus: number;
  overtimeAmount: number;
  overtimeType: string;
  overtimeDays: number;
  overtimeHours: number;
  totalDeductions: number;
  netSalary: number;
  lopDays: number;
  workingDays: number;
  effectiveDays: number;
  salaryStructureDeductions?: number;
}

interface PayslipDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payslipPreview: PayslipPreview | null;
  selectedEmployeeData: Employee | null;
  selectedMonth: string;
  onBackToEdit: () => void;
  onConfirmGenerate: () => void;
  isGenerating: boolean;
}

export function PayslipDetailSheet({
  open,
  onOpenChange,
  payslipPreview,
  selectedEmployeeData,
  selectedMonth,
  onBackToEdit,
  onConfirmGenerate,
  isGenerating,
}: PayslipDetailSheetProps) {
  // A5: a run for a month that has not ended yet assumes the remaining days
  // are worked. Block it until the user says so explicitly.
  const today = isoDateInTimezone();
  const monthEnded = today > `${selectedMonth}-${getDaysInMonth(monthKeyToDate(selectedMonth))}`;
  const [overrideIncompleteMonth, setOverrideIncompleteMonth] = useState(false);
  useEffect(() => {
    setOverrideIncompleteMonth(false);
  }, [selectedMonth, selectedEmployeeData?.id]);

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Payslip Preview"
      description={`Review the payslip for ${selectedEmployeeData?.firstName ?? "employee"} before generating.`}
      onSubmit={onConfirmGenerate}
      onCancel={onBackToEdit}
      submitLabel={
        <>
          <Check className="h-4 w-4 mr-1.5" />
          Confirm & Generate
        </>
      }
      cancelLabel={
        <>
          <Calculator className="h-4 w-4 mr-1.5" />
          Edit
        </>
      }
      isPending={isGenerating}
      submitDisabled={!monthEnded && !overrideIncompleteMonth}
      submitDisabledReason='Tick "Generate anyway" to generate for a month that has not ended.'
    >
      {!monthEnded && (
        <div className="rounded-md border border-border p-3 space-y-2">
          <p className="text-sm font-medium">
            {format(monthKeyToDate(selectedMonth), "MMMM yyyy")} has not ended
          </p>
          <p className="text-xs text-muted-foreground">
            Attendance is counted to {format(new Date(`${today}T00:00:00`), "dd MMM yyyy")} only.
            The remaining days of the month are paid as present.
          </p>
          <label className="flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={overrideIncompleteMonth}
              onChange={(e) => setOverrideIncompleteMonth(e.target.checked)}
            />
            <span>Generate anyway for this incomplete month</span>
          </label>
        </div>
      )}
      <Card className="gap-0">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start gap-4">
            <div className="min-w-0">
              <CardTitle className="text-base">
                {selectedEmployeeData?.firstName} {selectedEmployeeData?.lastName}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedEmployeeData?.designation || "Employee"}
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1">
              <Badge variant="outline">
                {format(monthKeyToDate(selectedMonth), "MMMM yyyy")}
              </Badge>
              <p className="text-2xs text-muted-foreground tabular-nums">
                {(() => {
                  const start = monthKeyToDate(selectedMonth);
                  const end = new Date(start.getFullYear(), start.getMonth(), getDaysInMonth(start));
                  return `${format(start, "dd MMM yyyy")} – ${format(end, "dd MMM yyyy")}`;
                })()}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <h4 className="font-semibold text-xs mb-3 text-success-strong uppercase tracking-wider">Earnings</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Basic Pay</span>
                <span className="tabular-nums">₹{payslipPreview?.basicPay.toLocaleString(DEFAULT_LOCALE)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">HRA</span>
                <span className="tabular-nums">₹{payslipPreview?.hra.toLocaleString(DEFAULT_LOCALE)}</span>
              </div>
              {(payslipPreview?.allowances || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Special Allowance</span>
                  <span className="tabular-nums">₹{payslipPreview?.allowances.toLocaleString(DEFAULT_LOCALE)}</span>
                </div>
              )}
              {(payslipPreview?.bonus || 0) > 0 && (
                <div className="flex justify-between text-success-strong">
                  <span>Bonus / Incentive</span>
                  <span className="tabular-nums">+₹{payslipPreview?.bonus.toLocaleString(DEFAULT_LOCALE)}</span>
                </div>
              )}
              {(payslipPreview?.overtimeAmount || 0) > 0 && (
                <div className="flex justify-between text-success-strong">
                  <span>
                    Overtime Pay
                    {payslipPreview?.overtimeType === "days"
                      ? ` (${payslipPreview.overtimeDays} days)`
                      : payslipPreview?.overtimeType === "hours"
                      ? ` (${payslipPreview.overtimeHours} hrs)`
                      : ""}
                  </span>
                  <span className="tabular-nums">+₹{payslipPreview?.overtimeAmount.toLocaleString(DEFAULT_LOCALE)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-medium">
                <span>Gross Salary</span>
                <span className="tabular-nums">₹{payslipPreview?.grossSalary.toLocaleString(DEFAULT_LOCALE)}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-xs mb-3 text-danger-strong uppercase tracking-wider">Deductions</h4>
            <div className="space-y-2 text-sm">
              {/* Hidden at 0 / N/A, as on the payslip PDF (payslip-view-model). */}
              {(payslipPreview?.professionalTax ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Professional Tax</span>
                  <span className="text-danger-strong tabular-nums">
                    -{fmtInr(payslipPreview?.professionalTax ?? 0)}
                  </span>
                </div>
              )}
              {(payslipPreview?.salaryStructureDeductions || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Salary deductions</span>
                  <span className="text-danger-strong tabular-nums">
                    -₹{Math.round(payslipPreview?.salaryStructureDeductions || 0).toLocaleString(DEFAULT_LOCALE)}
                  </span>
                </div>
              )}
              {(payslipPreview?.lopDays || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    LOP Deduction ({payslipPreview?.lopDays} {payslipPreview?.lopDays === 1 ? "day" : "days"})
                  </span>
                  <span className="text-danger-strong tabular-nums">
                    -₹{Math.round(payslipPreview?.lopDeduction || 0).toLocaleString(DEFAULT_LOCALE)}
                  </span>
                </div>
              )}
              {(payslipPreview?.otherDeductions || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Other Deductions</span>
                  <span className="text-danger-strong tabular-nums">
                    -₹{payslipPreview?.otherDeductions.toLocaleString(DEFAULT_LOCALE)}
                  </span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-medium">
                <span>Total Deductions</span>
                <span className="text-danger-strong tabular-nums">
                  -₹{Math.round(payslipPreview?.totalDeductions || 0).toLocaleString(DEFAULT_LOCALE)}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-center pt-2">
            <span className="text-base font-bold">Net Salary</span>
            <span className="font-display text-2xl font-bold tabular-nums text-success-strong">
              ₹{Math.round(payslipPreview?.netSalary || 0).toLocaleString(DEFAULT_LOCALE)}
            </span>
          </div>

          <div className="space-y-1 rounded-lg bg-surface-sunken p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Working Days</span>
              <span className="tabular-nums">{payslipPreview?.workingDays}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Effective Days</span>
              <span className="tabular-nums">{payslipPreview?.effectiveDays}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <button
        type="button"
        onClick={onBackToEdit}
        className="w-full text-xs text-muted-foreground hover:text-foreground py-2 underline-offset-4 hover:underline"
      >
        ← Back to Edit
      </button>
    </HrSheet>
  );
}
