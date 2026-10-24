"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { usePaginationParams } from "@/hooks/use-pagination-params";
import type { PageSizeOption } from "@/lib/pagination-constants";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, CreditCard, Download, Eye, Mail, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { monthKeyToDate } from "@/lib/date-utils";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import type { Tone } from "@/lib/design/tones";
import type { PayrollWithUser } from "@/types/hr";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";
import { isPayrollApprover } from "@/lib/constants/roles";
import { canDeleteHrRecord } from "@/lib/auth/separation-of-duties";

const PAYROLL_STATUS_TONE: Record<string, Tone> = {
  DRAFT: "neutral",
  PENDING_APPROVAL: "warning",
  APPROVED: "info",
  PAID: "success",
};

function fmtInr(value: string | number | null | undefined): string {
  const n = Math.round(parseFloat(String(value ?? "0")) || 0);
  return n.toLocaleString(DEFAULT_LOCALE);
}

function num(value: string | number | null | undefined): number {
  return parseFloat(String(value ?? "0")) || 0;
}

interface PayrollTableProps {
  payrolls: PayrollWithUser[];
  selectedMonth: string;
  year: string;
  month: string;
  employeeFilter: string;
  currentUserRole?: string;
  currentUserId?: string;
  onYearChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onEmployeeFilterChange: (value: string) => void;
  onPreview: (payroll: PayrollWithUser) => void;
  onApprove: (payrollId: number) => void;
  onMarkPaid: (payrollId: number) => void;
  onDelete: (payrollId: number) => void;
  onRecalculate?: (payrollId: number) => void;
  isRecalculatePending?: boolean;
  isApprovePending: boolean;
  isMarkPaidPending: boolean;
  isDeletePending: boolean;
  onDownload?: (payrollId: number) => void;
  onResendEmail?: (payrollId: number) => void;
  isResendPending?: boolean;
}

export function PayrollTable({
  payrolls,
  selectedMonth,
  year,
  month,
  employeeFilter,
  currentUserRole,
  currentUserId,
  onYearChange,
  onMonthChange,
  onEmployeeFilterChange,
  onPreview,
  onApprove,
  onMarkPaid,
  onDelete,
  onRecalculate,
  isRecalculatePending,
  isApprovePending,
  isMarkPaidPending,
  isDeletePending,
  onDownload,
  onResendEmail,
  isResendPending,
}: PayrollTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<PayrollWithUser | null>(null);
  const [approveTarget, setApproveTarget] = useState<PayrollWithUser | null>(null);
  const [markPaidTarget, setMarkPaidTarget] = useState<PayrollWithUser | null>(null);
  const selectedMonthKey = `${year}-${month}`;
  const payrollRows = payrolls.filter((p) => {
    if (p.month !== selectedMonthKey) return false;
    if (employeeFilter === "all") return true;
    const fullName = `${p.user?.firstName ?? ""} ${p.user?.lastName ?? ""}`.trim();
    return fullName === employeeFilter;
  });
  const selectedMonthDate = monthKeyToDate(selectedMonthKey);
  const selectedMonthLabel = Number.isNaN(selectedMonthDate.getTime())
    ? selectedMonth
    : format(selectedMonthDate, "MMMM yyyy");
  const createdYears = Array.from(
    new Set(
      payrolls
        .map((p) => p.month?.slice(0, 4))
        .filter((v): v is string => Boolean(v))
    )
  ).sort((a, b) => b.localeCompare(a));
  const yearOptions = Array.from(new Set([year, ...createdYears]));
  const employeeOptions = Array.from(
    new Set(
      payrolls
        .map((p) => `${p.user?.firstName ?? ""} ${p.user?.lastName ?? ""}`.trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const { page, pageSize, setPage, setPageSize, resetPage } = usePaginationParams();
  const totalPages = Math.max(1, Math.ceil(payrollRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = useMemo(
    () => payrollRows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [payrollRows, currentPage, pageSize]
  );

  const filterKey = `${selectedMonthKey}|${employeeFilter}`;
  const prevFilterKey = useRef(filterKey);
  useEffect(() => {
    if (prevFilterKey.current !== filterKey) {
      prevFilterKey.current = filterKey;
      resetPage();
    }
  }, [filterKey, resetPage]);

  return (
    <>
      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b">
          <CardTitle>
            Payroll for {selectedMonthLabel}
          </CardTitle>
          <CardDescription>Only the Super Admin or an Admin can approve a payroll, and never their own.</CardDescription>
          <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-3">
            <Select value={year} onValueChange={onYearChange}>
              <SelectTrigger className="h-9" aria-label="Year">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={month} onValueChange={onMonthChange}>
              <SelectTrigger className="h-9" aria-label="Month">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => ({
                  value: String(i + 1).padStart(2, "0"),
                  label: format(new Date(2000, i, 1), "MMMM"),
                })).map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={employeeFilter} onValueChange={onEmployeeFilterChange}>
              <SelectTrigger className="h-9" aria-label="Employee">
                <SelectValue placeholder="All employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                {employeeOptions.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent aria-live="polite" className="px-0 pb-0 pt-0">
          {payrollRows.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <Table className="tabular-nums [&_td]:py-3 [&_th]:py-3">
                  <caption className="sr-only">Payroll records for selected month</caption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 z-sticky bg-card pl-4">Employee</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">LOP days</TableHead>
                      <TableHead className="text-right">PT</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedRows.map((payroll) => (
                      <TableRow
                        key={payroll.id}
                        className="group cursor-pointer"
                        onClick={() => onPreview(payroll)}
                      >
                        <TableCell className="sticky left-0 z-base bg-card pl-4 group-hover:bg-muted">
                          <div>
                            <p className="font-medium whitespace-nowrap">
                              {payroll.user?.firstName} {payroll.user?.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {payroll.user?.designation}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right font-mono">
                          ₹{fmtInr(payroll.grossSalary)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right font-mono">
                          {num(payroll.lopDays) > 0 ? num(payroll.lopDays) : "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right font-mono">
                          {num(payroll.ptAmount) > 0 ? `₹${fmtInr(payroll.ptAmount)}` : "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right font-mono font-semibold">
                          ₹{fmtInr(Math.max(0, num(payroll.netSalary)))}
                        </TableCell>
                        <TableCell>
                          <StatusPill tone={PAYROLL_STATUS_TONE[payroll.status ?? "DRAFT"] ?? "neutral"} dot>
                            {payroll.status}
                          </StatusPill>
                        </TableCell>
                        {/* R3-0201: up to four buttons used to stack into a
                            120px-tall column and run off-screen at 375. Only
                            the action the row is waiting on stays visible; the
                            rest moved into the kebab. */}
                        <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {payroll.status === "DRAFT" &&
                              (isPayrollApprover(currentUserRole) && payroll.userId !== currentUserId ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1"
                                  onClick={() => setApproveTarget(payroll)}
                                  disabled={isApprovePending}
                                >
                                  <Check className="size-3.5 shrink-0" aria-hidden />
                                  Approve
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1"
                                  onClick={() => onPreview(payroll)}
                                  title="Only the Super Admin or an Admin can approve payrolls. This payroll stays in DRAFT until one of them approves it."
                                >
                                  <Eye className="size-3.5 shrink-0" aria-hidden />
                                  Preview
                                </Button>
                              ))}
                            {payroll.status === "APPROVED" && (
                              <Button
                                size="sm"
                                className="gap-1"
                                onClick={() => setMarkPaidTarget(payroll)}
                                disabled={isMarkPaidPending}
                              >
                                <CreditCard className="size-3.5 shrink-0" aria-hidden />
                                Mark Paid
                              </Button>
                            )}
                            {payroll.status === "PAID" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={() => onDownload?.(payroll.id)}
                              >
                                <Download className="size-3.5 shrink-0" aria-hidden />
                                Download
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`More actions for ${payroll.user?.firstName ?? ""} ${payroll.user?.lastName ?? ""}`.trim()}
                                >
                                  <MoreHorizontal className="size-4" aria-hidden />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onPreview(payroll)}>
                                  <Eye className="mr-2 size-4" aria-hidden />
                                  Preview
                                </DropdownMenuItem>
                                {/* MIYO-0126: HR reviews the payslip before it
                                    is paid; the PDF carries the status. */}
                                {payroll.status !== "PAID" && onDownload && (
                                  <DropdownMenuItem onClick={() => onDownload(payroll.id)}>
                                    <Download className="mr-2 size-4" aria-hidden />
                                    Download {payroll.status === "DRAFT" ? "draft" : "approved"} PDF
                                  </DropdownMenuItem>
                                )}
                                {payroll.status === "DRAFT" && onRecalculate && (
                                  <DropdownMenuItem
                                    onClick={() => onRecalculate(payroll.id)}
                                    disabled={isRecalculatePending}
                                  >
                                    <RefreshCw className="mr-2 size-4" aria-hidden />
                                    Recalculate
                                  </DropdownMenuItem>
                                )}
                                {payroll.status === "PAID" && onResendEmail && (
                                  <DropdownMenuItem
                                    onClick={() => onResendEmail(payroll.id)}
                                    disabled={isResendPending}
                                  >
                                    <Mail className="mr-2 size-4" aria-hidden />
                                    Resend payslip email
                                  </DropdownMenuItem>
                                )}
                                {/* Kept apart from Recalculate so it is not a mis-tap away
                                    (RESP-02), and Admin/Super Admin only (QA-AUTH-04). */}
                                {payroll.status === "DRAFT" && canDeleteHrRecord(currentUserRole) && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onClick={() => setDeleteTarget(payroll)}
                                      disabled={isDeletePending}
                                    >
                                      <Trash2 className="mr-2 size-4" aria-hidden />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="px-4">
                <DataTablePagination
                  page={currentPage}
                  totalPages={totalPages}
                  total={payrollRows.length}
                  limit={pageSize}
                  onPageChange={setPage}
                  onLimitChange={(limit) => setPageSize(limit as PageSizeOption)}
                />
              </div>
            </div>
          ) : (
            <EmptyState
              className="rounded-none border-0"
              title="No payroll records for this month"
              description="Click “Generate All” to create payroll for all employees"
            />
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this payroll record?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the draft payroll for{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.user?.firstName} {deleteTarget?.user?.lastName}
              </span>{" "}
              ({selectedMonthLabel}). This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletePending}
              onClick={() => {
                if (deleteTarget) onDelete(deleteTarget.id);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!approveTarget}
        onOpenChange={(open) => {
          if (!open) setApproveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve this payroll?</AlertDialogTitle>
            <AlertDialogDescription>
              This approves the payroll for{" "}
              <span className="font-medium text-foreground">
                {approveTarget?.user?.firstName} {approveTarget?.user?.lastName}
              </span>{" "}
              ({selectedMonthLabel}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApprovePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isApprovePending}
              onClick={() => {
                if (approveTarget) onApprove(approveTarget.id);
                setApproveTarget(null);
              }}
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!markPaidTarget}
        onOpenChange={(open) => {
          if (!open) setMarkPaidTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this payroll as paid?</AlertDialogTitle>
            <AlertDialogDescription>
              This marks the payroll for{" "}
              <span className="font-medium text-foreground">
                {markPaidTarget?.user?.firstName} {markPaidTarget?.user?.lastName}
              </span>{" "}
              ({selectedMonthLabel}) as paid.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMarkPaidPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isMarkPaidPending}
              onClick={() => {
                if (markPaidTarget) onMarkPaid(markPaidTarget.id);
                setMarkPaidTarget(null);
              }}
            >
              Mark Paid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
