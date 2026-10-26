"use client";

import { formatIST, monthKeyToDate } from "@/lib/date-utils";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/status-pill";
import type { Tone } from "@/lib/design/tones";

const STATUS_TONE: Record<string, Tone> = {
  DRAFT: "neutral",
  PENDING_APPROVAL: "warning",
  APPROVED: "info",
  PAID: "success",
};
import { Separator } from "@/components/ui/separator";
import { format, getDaysInMonth } from "date-fns";
import { HrSheet } from "@/features/hr/hr-sheet";
import type { PayrollWithUser } from "@/types/hr";
import { calendarDaysInMonth } from "@/lib/hr/payroll-calculations";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";
import { fmtInr } from "@/lib/hr/payslip-view-model";
import { payrollStatusLabel } from "@/lib/labels";

function n(v: string | null | undefined): number {
  return Math.round(parseFloat(String(v ?? "0")) || 0);
}

/** Payroll audit times in IST whatever the viewer's timezone (MIYO-0073). */
function dt(v: Date | string | null | undefined): string {
  const out = formatIST(v);
  return out ? `${out} IST` : "";
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
  const pt = n(payroll.ptAmount);
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
      <Card className="gap-0">
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
              <Badge variant="outline" className="tabular-nums">
                {format(monthKeyToDate(monthKey), "MMMM yyyy")}
              </Badge>
              <p className="text-2xs text-muted-foreground tabular-nums">
                {(() => {
                  const start = monthKeyToDate(monthKey);
                  const end = new Date(start.getFullYear(), start.getMonth(), getDaysInMonth(start));
                  return `${format(start, "dd MMM yyyy")} – ${format(end, "dd MMM yyyy")}`;
                })()}
              </p>
              <StatusPill tone={STATUS_TONE[payroll.status ?? ""] ?? "neutral"} dot>
                {payrollStatusLabel(payroll.status)}
              </StatusPill>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <h4 className="font-semibold text-xs mb-3 text-success-strong uppercase tracking-wider">Earnings</h4>
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
                <div className="flex justify-between text-success-strong">
                  <span>Bonus / Incentive</span>
                  <span className="tabular-nums">+₹{bonus.toLocaleString(DEFAULT_LOCALE)}</span>
                </div>
              )}
              {otAmt > 0 && (
                <div className="flex justify-between text-success-strong">
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
            <h4 className="font-semibold text-xs mb-3 text-danger-strong uppercase tracking-wider">Deductions</h4>
            <div className="space-y-2 text-sm">
              {/* Hidden at 0 / N/A, as on the payslip PDF (payslip-view-model). */}
              {pt > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Professional Tax</span>
                  <span className="text-danger-strong tabular-nums">-{fmtInr(pt)}</span>
                </div>
              )}
              {structureDed > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Salary deductions</span>
                  <span className="text-danger-strong tabular-nums">-₹{structureDed.toLocaleString(DEFAULT_LOCALE)}</span>
                </div>
              )}
              {lopD > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    LOP ({lopD} {lopD === 1 ? "day" : "days"})
                  </span>
                  <span className="text-danger-strong tabular-nums">-₹{lopAmt.toLocaleString(DEFAULT_LOCALE)}</span>
                </div>
              )}
              {otherDed > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Other Deductions</span>
                  <span className="text-danger-strong tabular-nums">-₹{otherDed.toLocaleString(DEFAULT_LOCALE)}</span>
                </div>
              )}
              {advance > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Advance / loan recovery</span>
                  <span className="text-danger-strong tabular-nums">-₹{advance.toLocaleString(DEFAULT_LOCALE)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-medium">
                <span>Total Deductions</span>
                <span className="text-danger-strong tabular-nums">-₹{totalDeductions.toLocaleString(DEFAULT_LOCALE)}</span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-center pt-2">
            <span className="text-base font-bold">Net Salary</span>
            <span className="font-display text-2xl font-bold tabular-nums text-success-strong">
              ₹{netSalary.toLocaleString(DEFAULT_LOCALE)}
            </span>
          </div>

          <div className="space-y-1 rounded-lg bg-surface-sunken p-3 text-xs">
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
            {/* MIYO-0128: an unapproved record showed "Approved:" and
                "Paid:" with nothing after them. Each row appears once it has
                happened; until then one line says what is being waited on. */}
            {payroll.approvedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Approved</span>
                <span className="tabular-nums">{dt(payroll.approvedAt)}</span>
              </div>
            )}
            {payroll.paidAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid</span>
                <span className="tabular-nums">{dt(payroll.paidAt)}</span>
              </div>
            )}
            {!payroll.approvedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span>Waiting for Super Admin or Admin approval</span>
              </div>
            )}
            {payroll.approvedAt && !payroll.paidAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span>Approved, not yet paid</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Generated by</span>
              <span className="tabular-nums">{actorName(payroll.generatedByUser, payroll.generatedBy)}</span>
            </div>
            {payroll.approvedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Approved by</span>
                <span className="tabular-nums">{actorName(payroll.approvedByUser, payroll.approvedBy)}</span>
              </div>
            )}
            {payroll.paidAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid by</span>
                <span className="tabular-nums">{actorName(payroll.paidByUser, payroll.paidBy)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </HrSheet>
  );
}
