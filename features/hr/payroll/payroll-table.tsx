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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { Check, CreditCard, Download, Eye, Mail, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { getColorSafe, payrollStatusColors } from "@/lib/theme-constants";
import type { PayrollWithUser } from "@/types/hr";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

function fmtInr(value: string | number | null | undefined): string {
  const n = Math.round(parseFloat(String(value ?? "0")) || 0);
  return n.toLocaleString(DEFAULT_LOCALE);
}

function num(value: string | number | null | undefined): number {
  return parseFloat(String(value ?? "0")) || 0;
}

function fmtDateTime(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "dd MMM yyyy, hh:mm a");
}

interface PayrollTableProps {
  payrolls: PayrollWithUser[];
  selectedMonth: string;
  year: string;
  month: string;
  employeeFilter: string;
  currentUserRole?: string;
  onYearChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onEmployeeFilterChange: (value: string) => void;
  onPreview: (payroll: PayrollWithUser) => void;
  onApprove: (payrollId: number) => void;
  onMarkPaid: (payrollId: number) => void;
  onDelete: (payrollId: number) => void;
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
  onYearChange,
  onMonthChange,
  onEmployeeFilterChange,
  onPreview,
  onApprove,
  onMarkPaid,
  onDelete,
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
  const selectedMonthDate = new Date(`${selectedMonthKey}-01`);
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
      <Card>
        <CardHeader>
          <CardTitle>
            Payroll for {selectedMonthLabel}
          </CardTitle>
          <CardDescription>
            Manage payroll status and generate payslips. HR/Admins can generate payslips, but
            only the CEO can approve them — including payrolls the CEO generated.
          </CardDescription>
          <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-3">
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={year}
              onChange={(e) => onYearChange(e.target.value)}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={month}
              onChange={(e) => onMonthChange(e.target.value)}
            >
              {Array.from({ length: 12 }, (_, i) => ({
                value: String(i + 1).padStart(2, "0"),
                label: format(new Date(2000, i, 1), "MMMM"),
              })).map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={employeeFilter}
              onChange={(e) => onEmployeeFilterChange(e.target.value)}
            >
              <option value="all">All employees</option>
              {employeeOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent aria-live="polite" className="px-0 pb-0 pt-0">
          {payrollRows.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <Table className="[&_th]:py-3 [&_td]:py-3">
                  <caption className="sr-only">Payroll records for selected month</caption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Employee</TableHead>
                      <TableHead>Gross Salary</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Net Salary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedRows.map((payroll) => (
                      <TableRow key={payroll.id}>
                        <TableCell className="pl-4">
                          <div>
                            <p className="font-medium whitespace-nowrap">
                              {payroll.user?.firstName} {payroll.user?.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {payroll.user?.designation}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Created: {fmtDateTime(payroll.createdAt)}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Approved: {fmtDateTime(payroll.approvedAt)} | Paid: {fmtDateTime(payroll.paidAt)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          ₹{fmtInr(payroll.grossSalary)}
                        </TableCell>
                        <TableCell className="text-destructive whitespace-nowrap">
                          -₹{fmtInr(Math.min(num(payroll.deductions), num(payroll.grossSalary)))}
                        </TableCell>
                        <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          ₹{fmtInr(Math.max(0, num(payroll.netSalary)))}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getColorSafe(payrollStatusColors, payroll.status ?? "DRAFT")}
                          >
                            {payroll.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => onPreview(payroll)}
                            >
                              <Eye className="h-3 w-3 shrink-0" aria-hidden />
                              Preview
                            </Button>
                            {payroll.status === "DRAFT" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setDeleteTarget(payroll)}
                                disabled={isDeletePending}
                              >
                                <Trash2 className="h-3 w-3 shrink-0" aria-hidden />
                                Delete
                              </Button>
                            )}
                            {payroll.status === "DRAFT" &&
                              (currentUserRole === "CEO" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1"
                                  onClick={() => setApproveTarget(payroll)}
                                  disabled={isApprovePending}
                                >
                                  <Check className="h-3 w-3 shrink-0" aria-hidden />
                                  Approve
                                </Button>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 rounded-md border border-amber-300/60 bg-amber-50 px-2 py-1 text-[11px] text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-400"
                                  title="Only the CEO can approve payrolls. This payroll stays in DRAFT until the CEO approves it."
                                >
                                  Awaiting CEO approval
                                </span>
                              ))}
                            {payroll.status === "APPROVED" && (
                              <Button
                                size="sm"
                                className="gap-1"
                                onClick={() => setMarkPaidTarget(payroll)}
                                disabled={isMarkPaidPending}
                              >
                                <CreditCard className="h-3 w-3 shrink-0" aria-hidden />
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
                                <Download className="h-3 w-3 shrink-0" aria-hidden />
                                Download
                              </Button>
                            )}
                            {payroll.status === "PAID" && onResendEmail && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={() => onResendEmail(payroll.id)}
                                disabled={isResendPending}
                                title="Resend the payslip email to this employee"
                              >
                                <Mail className="h-3 w-3 shrink-0" aria-hidden />
                                Resend
                              </Button>
                            )}
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
            <div className="text-center px-4 py-12 text-muted-foreground">
              <EmptyExpensesIllustration className="mx-auto mb-4 w-40 h-40" />
              <p>No payroll records for this month</p>
              <p className="text-sm">
                Click &ldquo;Generate All&rdquo; to create payroll for all employees
              </p>
            </div>
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
