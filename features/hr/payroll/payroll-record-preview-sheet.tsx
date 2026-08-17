"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format, getDaysInMonth } from "date-fns";
import { HrSheet } from "@/features/hr/hr-sheet";
import type { PayrollWithUser } from "@/types/hr";
import { calendarDaysInMonth } from "@/lib/hr/payroll-calculations";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

function n(v: string | null | undefined): number {
  return Math.round(parseFloat(String(v ?? "0")) || 0);
}

function dt(v: Date | string | null | undefined): string {
  if (!v) return "";
  const parsed = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(parsed.getTime())) return "";
  return format(parsed, "dd MMM yyyy, hh:mm a");
}

function actorName(
  actor: { name: string | null } | null | undefined,
  id: string | null | undefined
): string {
  if (actor?.name) return actor.name;
  if (id) return id;
  return "";
}

interface PayrollRecordPreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payroll: PayrollWithUser | null;
}

export function PayrollRecordPreviewSheet({
  open,
  onOpenChange,
  payroll,
}: PayrollRecordPreviewSheetProps) {
  if (!payroll) return null;

  const monthKey = payroll.month;
  const workingDays = calendarDaysInMonth(monthKey);
  const lopD = parseFloat(String(payroll.lopDays ?? "0")) || 0;
  const effectiveDays = Math.max(0, workingDays - lopD);

  const basicPay = n(payroll.basicSalary);
  const hra = n(payroll.hra);
  const specialAllowance = n(payroll.specialAllowance);
  const bonus = n(payroll.allowances);
  const otAmt = n(payroll.overtimeAmount);
  const grossSalary = n(payroll.grossSalary);
  const pt = n(payroll.ptAmount ?? "200");
  const structureDed = n(payroll.structureDeductions);
  const lopAmt = n(payroll.lopAmount);
  const otherDed = n(payroll.otherDeductions);
  const advance = n(payroll.advanceRecoveryAmount);
  const totalDeductions = n(payroll.deductions);
  const netSalary = n(payroll.netSalary);

  const otType = payroll.overtimeType;
  const otDays = parseFloat(String(payroll.overtimeDays ?? "0")) || 0;
  const otHours = parseFloat(String(payroll.overtimeHours ?? "0")) || 0;

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Payroll preview"
      description="Read-only breakdown for this payroll record."
      showSubmit={false}
    >
      <Card className="border-2">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start gap-4">
            <div className="min-w-0">
              <CardTitle className="text-base">
                {payroll.user?.firstName} {payroll.user?.lastName}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {payroll.user?.designation || "Employee"}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge variant="outline">
                {format(new Date(monthKey + "-01"), "MMMM yyyy")}
              </Badge>
              <p className="text-[10px] text-muted-foreground tabular-nums">
                {(() => {
                  const start = new Date(monthKey + "-01");
                  const end = new Date(start.getFullYear(), start.getMonth(), getDaysInMonth(start));
                  return `${format(start, "dd MMM yyyy")} – ${format(end, "dd MMM yyyy")}`;
                })()}
              </p>
              <Badge variant="secondary" className="text-[10px]">
                {payroll.status ?? ""}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <h4 className="font-semibold text-xs mb-3 text-emerald-600 uppercase tracking-wider">Earnings</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Basic Pay</span>
                <span className="tabular-nums">₹{basicPay.toLocaleString(DEFAULT_LOCALE)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">HRA</span>
                <span className="tabular-nums">₹{hra.toLocaleString(DEFAULT_LOCALE)}</span>
              </div>
              {specialAllowance > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Special Allowance</span>
                  <span className="tabular-nums">₹{specialAllowance.toLocaleString(DEFAULT_LOCALE)}</span>
                </div>
              )}
              {bonus > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Bonus / Incentive</span>
                  <span className="tabular-nums">+₹{bonus.toLocaleString(DEFAULT_LOCALE)}</span>
                </div>
              )}
              {otAmt > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>
                    Overtime Pay
                    {otType === "days"
                      ? ` (${otDays} days)`
                      : otType === "hours"
                        ? ` (${otHours} hrs)`
                        : ""}
                  </span>
                  <span className="tabular-nums">+₹{otAmt.toLocaleString(DEFAULT_LOCALE)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-medium">
                <span>Gross Salary</span>
                <span className="tabular-nums">₹{grossSalary.toLocaleString(DEFAULT_LOCALE)}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-xs mb-3 text-red-600 uppercase tracking-wider">Deductions</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Professional Tax</span>
                <span className="text-red-600 tabular-nums">-₹{pt.toLocaleString(DEFAULT_LOCALE)}</span>
              </div>
              {structureDed > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Salary deductions</span>
                  <span className="text-red-600 tabular-nums">-₹{structureDed.toLocaleString(DEFAULT_LOCALE)}</span>
                </div>
              )}
              {lopD > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    LOP ({lopD} {lopD === 1 ? "day" : "days"})
                  </span>
                  <span className="text-red-600 tabular-nums">-₹{lopAmt.toLocaleString(DEFAULT_LOCALE)}</span>
                </div>
              )}
              {otherDed > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Other Deductions</span>
                  <span className="text-red-600 tabular-nums">-₹{otherDed.toLocaleString(DEFAULT_LOCALE)}</span>
                </div>
              )}
              {advance > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Advance / loan recovery</span>
                  <span className="text-red-600 tabular-nums">-₹{advance.toLocaleString(DEFAULT_LOCALE)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-medium">
                <span>Total Deductions</span>
                <span className="text-red-600 tabular-nums">-₹{totalDeductions.toLocaleString(DEFAULT_LOCALE)}</span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-center pt-2">
            <span className="text-base font-bold">Net Salary</span>
            <span className="text-2xl font-bold text-emerald-600 tabular-nums">
              ₹{netSalary.toLocaleString(DEFAULT_LOCALE)}
            </span>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Calendar days</span>
              <span className="tabular-nums">{workingDays}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Approx. effective days</span>
              <span className="tabular-nums">{effectiveDays.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span className="tabular-nums">{dt(payroll.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Approved</span>
              <span className="tabular-nums">{dt(payroll.approvedAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid</span>
              <span className="tabular-nums">{dt(payroll.paidAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Generated by</span>
              <span className="tabular-nums">{actorName(payroll.generatedByUser, payroll.generatedBy)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Approved by</span>
              <span className="tabular-nums">{actorName(payroll.approvedByUser, payroll.approvedBy)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid by</span>
              <span className="tabular-nums">{actorName(payroll.paidByUser, payroll.paidBy)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </HrSheet>
  );
}
