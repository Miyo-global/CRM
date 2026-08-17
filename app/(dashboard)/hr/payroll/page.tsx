"use client";
import { getErrorMessage } from "@/lib/get-error-message";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  useHrAllPayrolls,
  useHrEmployees,
  useApprovePayroll,
  useMarkPayrollPaid,
  useDeletePayroll,
  useHrSalaryStructures,
  useResendPayslipEmail,
} from "@/lib/api/hooks/hr";
import {
  useOvertimePreview,
  usePayrollSchedule,
  useGeneratePayslipWithPeriod,
} from "@/lib/api/hooks/hr/payroll-extended";
import { useSalaryLoans } from "@/lib/api/hooks/hr/loans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";
import { Users, DollarSign, CreditCard, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { Employee, PayrollWithUser } from "@/types/hr";
import { isAxiosError } from "axios";

import { PayrollTable } from "@/features/hr/payroll/payroll-table";
import { PayrollRecordPreviewSheet } from "@/features/hr/payroll/payroll-record-preview-sheet";
import { GeneratePayrollSheet, type PayrollPeriodMode } from "@/features/hr/payroll/generate-payroll-sheet";
import {
  buildPayslipPreviewFromEmployee,
  PROFESSIONAL_TAX_INR,
} from "@/lib/hr/payroll-calculations";
import {
  pickSalaryStructureForPayrollMonth,
  resolvePayrollMonthlyCtc,
} from "@/lib/hr/salary-effective-dates";
import { CURRENCY_SYMBOL, DEFAULT_LOCALE } from "@/lib/constants/locale";

function ordinalDay(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

export default function PayrollPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserRole = session?.user?.role ?? "";
  const searchParams = useSearchParams();
  const selectedMonth = searchParams.get("month") || format(new Date(), "yyyy-MM");
  const selectedYear = selectedMonth.slice(0, 4);
  const selectedMonthPart = selectedMonth.slice(5, 7);
  const employeeFilter = searchParams.get("employee") || "all";
  const setSelectedMonth = useCallback(
    (month: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("month", month);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );
  const setSelectedYear = useCallback(
    (year: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("month", `${year}-${selectedMonthPart}`);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, selectedMonthPart]
  );
  const setSelectedMonthPart = useCallback(
    (monthPart: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("month", `${selectedYear}-${monthPart}`);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, selectedYear]
  );
  const setEmployeeFilter = useCallback(
    (employeeName: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (employeeName === "all") params.delete("employee");
      else params.set("employee", employeeName);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );
  const [previewPayroll, setPreviewPayroll] = useState<PayrollWithUser | null>(null);
  const [generateSheetOpen, setGenerateSheetOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const [otherDeductions, setOtherDeductions] = useState<string>("");
  const [bonus, setBonus] = useState<string>("");
  const [periodMode, setPeriodMode] = useState<PayrollPeriodMode>("month");
  const [periodStart, setPeriodStart] = useState<string>("");
  const [periodEnd, setPeriodEnd] = useState<string>("");

  const { data: allPayrolls, isLoading } = useHrAllPayrolls({ month: selectedMonth });
  const { data: payrollSchedule } = usePayrollSchedule();
  const { data: employeesRaw } = useHrEmployees();
  const { data: salaryStructures } = useHrSalaryStructures(selectedEmployee || undefined);
  const { data: overtimePreview } = useOvertimePreview(
    { userId: selectedEmployee, month: selectedMonth },
  );

  const employees = useMemo(
    () =>
      (Array.isArray(employeesRaw)
        ? employeesRaw
        : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[],
    [employeesRaw]
  );

  const salaryStructureList = useMemo(() => {
    if (!salaryStructures) return [];
    return Array.isArray(salaryStructures) ? salaryStructures : [];
  }, [salaryStructures]);

  const activeSalary = useMemo(() => {
    return salaryStructureList.find((s) => s.isActive) ?? null;
  }, [salaryStructureList]);

  const pickedStructureForMonth = useMemo(
    () => pickSalaryStructureForPayrollMonth(salaryStructureList, selectedMonth),
    [salaryStructureList, selectedMonth]
  );

  const salaryRowForPreview = pickedStructureForMonth ?? activeSalary;

  const { data: salaryLoans } = useSalaryLoans();

  const generateWithPeriodMutation = useGeneratePayslipWithPeriod();
  const approvePayrollMutation = useApprovePayroll();
  const markPaidMutation = useMarkPayrollPaid();
  const resendPayslipEmailMutation = useResendPayslipEmail();
  const deletePayrollMutation = useDeletePayroll();

  const selectedEmployeeData = useMemo(() => {
    if (!selectedEmployee || !employees.length) return null;
    return employees.find((e) => e.id === selectedEmployee) ?? null;
  }, [selectedEmployee, employees]);

  const payslipPreview = useMemo(() => {
    if (!selectedEmployeeData) return null;

    const otAmt = overtimePreview?.overtimeAmount ?? 0;
    const employeeMonthlySalary = parseFloat(selectedEmployeeData.monthlySalary || "0");
    const structureDeductions = parseFloat(salaryRowForPreview?.deductions ?? "0");

    const targetCtc = resolvePayrollMonthlyCtc({
      picked: pickedStructureForMonth,
      fallbackStructure: activeSalary,
      employeeMonthlySalary,
    });
    if (targetCtc <= 0) return null;

    const s = salaryRowForPreview;
    const statutory = s
      ? {
          pfApplicable: s.pfApplicable ?? false,
          pfEmployeeRate: parseFloat(s.pfEmployeeRate ?? "12"),
          pfEmployerRate: parseFloat(s.pfEmployerRate ?? "12"),
          pfWageCeiling: parseFloat(s.pfWageCeiling ?? "15000"),
          esiApplicable: s.esiApplicable ?? false,
          esiEmployeeRate: parseFloat(s.esiEmployeeRate ?? "0.75"),
          esiEmployerRate: parseFloat(s.esiEmployerRate ?? "3.25"),
          esiWageCeiling: parseFloat(s.esiWageCeiling ?? "21000"),
        }
      : undefined;

    const activeLoan = (salaryLoans ?? []).find(
      (l) =>
        l.userId === selectedEmployeeData.id &&
        l.status === "ACTIVE" &&
        (l.totalEmis ?? 0) > 0 &&
        (l.paidEmis ?? 0) < (l.totalEmis ?? 0)
    );
    const advanceRecoveryAmount = activeLoan ? parseFloat(activeLoan.emiAmount ?? "0") : 0;

    return buildPayslipPreviewFromEmployee({
      monthlySalary: targetCtc,
      month: selectedMonth,
      lopDays: overtimePreview?.lopDays ?? 0,
      otherDeductions: parseFloat(otherDeductions) || 0,
      bonus: parseFloat(bonus) || 0,
      overtimeAmount: otAmt,
      overtimeType: otAmt > 0 ? "days" : "",
      overtimeDays: overtimePreview?.overtimeDays ?? 0,
      overtimeHours: 0,
      salaryStructureDeductions: structureDeductions,
      professionalTax: PROFESSIONAL_TAX_INR,
      statutory,
      advanceRecoveryAmount,
    });
  }, [
    selectedEmployeeData,
    selectedMonth,
    otherDeductions,
    bonus,
    overtimePreview,
    pickedStructureForMonth,
    salaryRowForPreview,
    activeSalary,
    salaryLoans,
  ]);

  const resetSheet = () => {
    setGenerateSheetOpen(false);
    setSelectedEmployee("");
    setShowPreview(false);
    setOtherDeductions("");
    setBonus("");
    setPeriodMode("month");
    setPeriodStart("");
    setPeriodEnd("");
  };

  const handleShowPreview = useCallback(() => {
    if (!selectedEmployee) {
      toast.error("Please select an employee");
      return;
    }
    const monthly = parseFloat(selectedEmployeeData?.monthlySalary || "0");
    const targetCtc = resolvePayrollMonthlyCtc({
      picked: pickedStructureForMonth,
      fallbackStructure: activeSalary,
      employeeMonthlySalary: monthly,
    });
    if (targetCtc <= 0) {
      toast.error(
        "Set the employee’s monthly salary or add a salary structure before preview."
      );
      return;
    }
    setShowPreview(true);
  }, [selectedEmployee, selectedEmployeeData, pickedStructureForMonth, activeSalary]);

  const handleGenerateForEmployee = useCallback(() => {
    if (!selectedEmployee) return;
    const useCustom = periodMode === "custom" && !!periodStart && !!periodEnd;
    generateWithPeriodMutation.mutate(
      {
        userId: selectedEmployee,
        month: selectedMonth,
        otherDeductions: parseFloat(otherDeductions) || 0,
        bonus: parseFloat(bonus) || 0,
        ...(useCustom ? { periodStart, periodEnd } : {}),
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: queryKeys.hr.payrolls({ month: selectedMonth }) });
          qc.invalidateQueries({ queryKey: queryKeys.hr.payrolls() });
          toast.success("Payslip generated successfully");
          resetSheet();
        },
        onError: (error) => {
          const msg = getErrorMessage(error);
          if (msg.toLowerCase().includes("already exists")) {
            toast.error("Payroll already generated", { description: `A payslip for this employee in ${format(new Date(selectedMonth + "-01"), "MMMM yyyy")} already exists. Delete it first to regenerate.` });
          } else {
            toast.error(msg);
          }
        },
      }
    );
  }, [selectedEmployee, generateWithPeriodMutation, selectedMonth, otherDeductions, bonus, periodMode, periodStart, periodEnd, qc]);

  const handleApprovePayroll = useCallback((payrollId: number) => {
    approvePayrollMutation.mutate(
      { payrollId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: queryKeys.hr.payrolls({ month: selectedMonth }) });
          toast.success("Payroll approved — you can now mark it as paid.");
        },
        onError: (error) => {
          if (isAxiosError(error) && error.response?.status === 403) {
            toast.error(getErrorMessage(error), {
              description: "Only the CEO can approve payrolls. It stays in DRAFT until the CEO approves it.",
            });
            return;
          }
          toast.error(getErrorMessage(error));
        },
      }
    );
  }, [approvePayrollMutation, selectedMonth, qc]);

  const reportEmailOutcome = useCallback(
    (data: { emailSent: boolean; emailError?: string }, opts: { onSuccessText: string }) => {
      if (data.emailSent) {
        toast.success(opts.onSuccessText);
        return;
      }
      const msg =
        data.emailError === "no_email"
          ? "Payslip email was not sent: employee has no email on file."
          : data.emailError === "send_failed"
            ? "Payslip email could not be sent. Check server logs and use Resend once the issue is fixed."
            : "Payslip email was not sent.";
      toast.warning(msg);
    },
    []
  );

  const handleMarkPaid = useCallback((payrollId: number) => {
    markPaidMutation.mutate(
      { payrollId },
      {
        onSuccess: (data) => {
          qc.invalidateQueries({ queryKey: queryKeys.hr.payrolls({ month: selectedMonth }) });
          toast.success("Payroll marked as paid");
          if (!data.emailSent) {
            reportEmailOutcome(data, { onSuccessText: "" });
          }
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      }
    );
  }, [markPaidMutation, selectedMonth, qc, reportEmailOutcome]);

  const handleResendEmail = useCallback((payrollId: number) => {
    resendPayslipEmailMutation.mutate(
      { payrollId },
      {
        onSuccess: (data) => {
          reportEmailOutcome(data, { onSuccessText: "Payslip email resent." });
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      }
    );
  }, [resendPayslipEmailMutation, reportEmailOutcome]);

  const handleDownloadPayslip = useCallback((payrollId: number) => {
    window.open(`/api/hr/payrolls/${payrollId}/download`, "_blank");
  }, []);

  const handleDeletePayroll = useCallback(
    (payrollId: number) => {
      deletePayrollMutation.mutate(
        { payrollId },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.hr.payrolls({ month: selectedMonth }) });
            toast.success("Draft payroll deleted");
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        }
      );
    },
    [deletePayrollMutation, selectedMonth, qc]
  );

  const filteredPayrolls = useMemo(() => {
    const rows = allPayrolls ?? [];
    if (employeeFilter === "all") return rows;
    return rows.filter((p) => {
      const fullName = `${p.user?.firstName ?? ""} ${p.user?.lastName ?? ""}`.trim();
      return fullName === employeeFilter;
    });
  }, [allPayrolls, employeeFilter]);

  const totalGross =
    filteredPayrolls.reduce((sum, p) => sum + parseFloat(p.grossSalary || "0"), 0) || 0;
  const totalNet =
    filteredPayrolls.reduce((sum, p) => sum + Math.max(0, parseFloat(p.netSalary || "0")), 0) || 0;

  if (isLoading) {
    return (
      <div className="space-y-6 px-4 sm:px-6 py-5">
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Skeleton className="h-9 w-[180px]" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-7 w-32" />
                </div>
                <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
              </div>
            </div>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-3 border-b border-border/50"
                >
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageWrapper
      title="Payroll Management"
      subtitle="Generate and manage employee payrolls"
      actions={
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex items-center gap-1.5">
            <label htmlFor="payroll-period" className="text-xs text-muted-foreground hidden sm:inline">
              Period
            </label>
            <Input
              id="payroll-period"
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                if (e.target.value) setSelectedMonth(e.target.value);
              }}
              className="w-[150px] sm:w-[170px]"
              aria-label="Payroll period (month)"
              title="Pick any month — payroll is calculated per calendar month"
            />
          </div>

          <Button variant="outline" onClick={() => setGenerateSheetOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Individual
          </Button>

          <GeneratePayrollSheet
            open={generateSheetOpen}
            onOpenChange={(open) => {
              if (!open) resetSheet();
              else setGenerateSheetOpen(true);
            }}
            employees={employees}
            selectedEmployee={selectedEmployee}
            onSelectedEmployeeChange={setSelectedEmployee}
            showPreview={showPreview}
            onShowPreview={handleShowPreview}
            onBackToEdit={() => setShowPreview(false)}
            bonus={bonus}
            onBonusChange={setBonus}
            otherDeductions={otherDeductions}
            onOtherDeductionsChange={setOtherDeductions}
            overtimePreview={selectedEmployee ? overtimePreview : null}
            payslipPreview={payslipPreview}
            selectedEmployeeData={selectedEmployeeData}
            selectedMonth={selectedMonth}
            periodMode={periodMode}
            onPeriodModeChange={setPeriodMode}
            periodStart={periodStart}
            onPeriodStartChange={setPeriodStart}
            periodEnd={periodEnd}
            onPeriodEndChange={setPeriodEnd}
            onConfirmGenerate={handleGenerateForEmployee}
            isGenerating={generateWithPeriodMutation.isPending}
          />
        </div>
      }
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </span>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Automatic payroll</p>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                    payrollSchedule?.isEnabled
                      ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {payrollSchedule?.isEnabled ? "On" : "Off"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {payrollSchedule?.isEnabled
                  ? `Runs on the ${ordinalDay(payrollSchedule.dayOfMonth)} of each month${payrollSchedule.autoApprove ? " · auto-approved" : ""}.`
                  : "Generate payroll automatically each month on a fixed day."}
                {payrollSchedule?.lastRunPeriod
                  ? ` Last run: ${format(new Date(payrollSchedule.lastRunPeriod + "-01"), "MMM yyyy")}.`
                  : ""}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/payroll-schedule">Manage schedule</Link>
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <StatCard
            label="Total Employees"
            value={filteredPayrolls.length}
            icon={Users}
            color="blue"
          />
          <StatCard
            label="Total Gross"
            value={`${CURRENCY_SYMBOL}${totalGross.toLocaleString(DEFAULT_LOCALE)}`}
            icon={DollarSign}
            color="gold"
          />
          <StatCard
            label="Total Net Payout"
            value={`${CURRENCY_SYMBOL}${totalNet.toLocaleString(DEFAULT_LOCALE)}`}
            icon={CreditCard}
            color="green"
          />
        </div>

        {(allPayrolls?.length ?? 0) === 0 ? (
          <EmptyState
            illustration={<EmptyExpensesIllustration className="h-40 w-40" />}
            title="No payroll records yet"
            description={`No payroll generated for ${format(new Date(selectedMonth + "-01"), "MMMM yyyy")}. Generate payroll for all employees or create one for an individual.`}
          />
        ) : (
          <PayrollTable
            payrolls={allPayrolls ?? []}
            selectedMonth={selectedMonth}
            year={selectedYear}
            month={selectedMonthPart}
            employeeFilter={employeeFilter}
            currentUserRole={currentUserRole}
            onYearChange={setSelectedYear}
            onMonthChange={setSelectedMonthPart}
            onEmployeeFilterChange={setEmployeeFilter}
            onPreview={setPreviewPayroll}
            onApprove={handleApprovePayroll}
            onMarkPaid={handleMarkPaid}
            onDelete={handleDeletePayroll}
            isApprovePending={approvePayrollMutation.isPending}
            isMarkPaidPending={markPaidMutation.isPending}
            isDeletePending={deletePayrollMutation.isPending}
            onDownload={handleDownloadPayslip}
            onResendEmail={handleResendEmail}
            isResendPending={resendPayslipEmailMutation.isPending}
          />
        )}
        {(allPayrolls?.length ?? 0) > 0 && filteredPayrolls.length === 0 && (
          <EmptyState
            illustration={<EmptyExpensesIllustration className="h-32 w-32" />}
            title="No records for selected filters"
            description="Try a different employee or month/year combination."
          />
        )}

        <PayrollRecordPreviewSheet
          open={!!previewPayroll}
          onOpenChange={(open) => {
            if (!open) setPreviewPayroll(null);
          }}
          payroll={previewPayroll}
        />
      </div>
    </PageWrapper>
  );
}
