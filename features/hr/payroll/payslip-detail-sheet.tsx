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
import { format, getDaysInMonth } from "date-fns";
import { HrSheet } from "@/features/hr/hr-sheet";
import type { Employee } from "@/types/hr";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

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
    >
      <Card className="border-2">
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
                {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}
              </Badge>
              <p className="text-[10px] text-muted-foreground tabular-nums">
                {(() => {
                  const start = new Date(selectedMonth + "-01");
                  const end = new Date(start.getFullYear(), start.getMonth(), getDaysInMonth(start));
                  return `${format(start, "dd MMM yyyy")} – ${format(end, "dd MMM yyyy")}`;
                })()}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <h4 className="font-semibold text-xs mb-3 text-emerald-600 uppercase tracking-wider">Earnings</h4>
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
                <div className="flex justify-between text-emerald-600">
                  <span>Bonus / Incentive</span>
                  <span className="tabular-nums">+₹{payslipPreview?.bonus.toLocaleString(DEFAULT_LOCALE)}</span>
                </div>
              )}
              {(payslipPreview?.overtimeAmount || 0) > 0 && (
                <div className="flex justify-between text-emerald-600">
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
            <h4 className="font-semibold text-xs mb-3 text-red-600 uppercase tracking-wider">Deductions</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Professional Tax</span>
                <span className="text-red-600 tabular-nums">
                  -₹{payslipPreview?.professionalTax.toLocaleString(DEFAULT_LOCALE)}
                </span>
              </div>
              {(payslipPreview?.salaryStructureDeductions || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Salary deductions</span>
                  <span className="text-red-600 tabular-nums">
                    -₹{Math.round(payslipPreview?.salaryStructureDeductions || 0).toLocaleString(DEFAULT_LOCALE)}
                  </span>
                </div>
              )}
              {(payslipPreview?.lopDays || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    LOP Deduction ({payslipPreview?.lopDays} {payslipPreview?.lopDays === 1 ? "day" : "days"})
                  </span>
                  <span className="text-red-600 tabular-nums">
                    -₹{Math.round(payslipPreview?.lopDeduction || 0).toLocaleString(DEFAULT_LOCALE)}
                  </span>
                </div>
              )}
              {(payslipPreview?.otherDeductions || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Other Deductions</span>
                  <span className="text-red-600 tabular-nums">
                    -₹{payslipPreview?.otherDeductions.toLocaleString(DEFAULT_LOCALE)}
                  </span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-medium">
                <span>Total Deductions</span>
                <span className="text-red-600 tabular-nums">
                  -₹{Math.round(payslipPreview?.totalDeductions || 0).toLocaleString(DEFAULT_LOCALE)}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-center pt-2">
            <span className="text-base font-bold">Net Salary</span>
            <span className="text-2xl font-bold text-emerald-600 tabular-nums">
              ₹{Math.round(payslipPreview?.netSalary || 0).toLocaleString(DEFAULT_LOCALE)}
            </span>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
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
