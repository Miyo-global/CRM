"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { formatINR } from "@/lib/format-utils";
import { isAdminOrOwner } from "@/lib/auth/role-guards";
import { canDecideRequest } from "@/lib/auth/separation-of-duties";
import { useState, useCallback, useMemo } from "react";
import { createLoanSchema, LOAN_REASON_MAX, MAX_LOAN_AMOUNT, MAX_LOAN_EMIS } from "@/lib/validations/loan";
import {
  useSalaryLoans, useCreateSalaryLoan, useProcessSalaryLoan,
  type SalaryLoan,
} from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Tone } from "@/lib/design/tones";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, CheckCircle2, XCircle, IndianRupee } from "lucide-react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";

function statusTone(s: string | null): Tone {
  if (s === "ACTIVE") return "info";
  if (s === "REPAID") return "success";
  if (s === "APPROVED") return "success";
  if (s === "REJECTED") return "danger";
  return "warning";
}

export default function LoansPage() {
  const { data: session } = useSession();
  const { data: loans, isLoading, isError, error, refetch } = useSalaryLoans();
  const create = useCreateSalaryLoan();
  const process = useProcessSalaryLoan();
  const isAdmin = isAdminOrOwner(session?.user?.role);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [totalEmis, setTotalEmis] = useState("6");
  // Inline errors appear after the first submit attempt, then track edits.
  const [showErrors, setShowErrors] = useState(false);

  const parsed = useMemo(
    () => createLoanSchema.safeParse({
      amount: amount.trim() === "" ? undefined : Number(amount),
      reason,
      totalEmis: totalEmis.trim() === "" ? undefined : Number(totalEmis),
    }),
    [amount, reason, totalEmis],
  );
  const fieldErrors = useMemo(() => {
    const out: Partial<Record<"amount" | "reason" | "totalEmis", string>> = {};
    if (!showErrors) return out;
    if (totalEmis.trim() === "") out.totalEmis = `EMIs must be a whole number between 1 and ${MAX_LOAN_EMIS}`;
    if (parsed.success) return out;
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof typeof out;
      out[key] ??= issue.message;
    }
    return out;
  }, [parsed, showErrors, totalEmis]);

  const handleCreate = useCallback(() => {
    setShowErrors(true);
    if (!parsed.success || totalEmis.trim() === "") return;
    create.mutate(
      parsed.data,
      {
        onSuccess: () => {
          toast.success("Loan request submitted");
          setSheetOpen(false); setAmount(""); setReason(""); setTotalEmis("6"); setShowErrors(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [parsed, totalEmis, create]);

  // Notifications link here with ?id=<loan> (P3-notification-deeplink-no-entity-id).
  const focusId = Number(useSearchParams().get("id")) || null;
  const scrollToFocused = useCallback((row: HTMLTableRowElement | null) => {
    row?.scrollIntoView({ block: "center" });
  }, []);

  const [disburseId, setDisburseId] = useState<number | null>(null);
  const [repaidId, setRepaidId] = useState<number | null>(null);

  const handleTransition = useCallback(
    (id: number, status: "ACTIVE" | "REPAID", done: () => void, message: string) => {
      process.mutate({ id, status }, {
        onSuccess: () => { toast.success(message); done(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [process],
  );

  const handleApprove = useCallback((id: number) => {
    process.mutate({ id, status: "APPROVED" }, {
      onSuccess: () => toast.success("Loan approved"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [process]);

  const handleReject = useCallback(() => {
    if (!rejectId) return;
    process.mutate({ id: rejectId, status: "REJECTED" }, {
      onSuccess: () => { toast.success("Loan rejected"); setRejectId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [rejectId, process]);

  if (isLoading) {
    return (
      <PageWrapper title="Salary loans">
        <Skeleton className="h-80 rounded-lg" />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Salary loans"
      badge={`${loans?.length ?? 0} loans`}
      actions={<Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="size-4" aria-hidden="true" />Request Loan</Button>}
    >
      {isError ? (
        <QueryErrorState title="Couldn't load salary loans" error={error} onRetry={() => refetch()} />
      ) : !loans?.length ? (
        <EmptyState
          title="No salary loans"
          description="Approved and pending salary loans will appear here."
          action={{ label: "Request Loan", onClick: () => setSheetOpen(true) }}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table className="min-w-[760px] tabular-nums">
            <caption className="sr-only">Salary loans</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Loan</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>EMIs</TableHead>
                <TableHead className="text-right">EMI / mo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((loan: SalaryLoan) => (
                <TableRow
                  key={loan.id}
                  data-state={loan.id === focusId ? "selected" : undefined}
                  aria-current={loan.id === focusId ? "true" : undefined}
                  ref={loan.id === focusId ? scrollToFocused : undefined}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{loan.user?.name ?? "—"}</p>
                        {loan.reason && (
                          <p className="max-w-64 truncate text-xs text-muted-foreground" title={loan.reason}>
                            {loan.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatINR(loan.amount)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {loan.totalEmis ? `${loan.paidEmis ?? 0}/${loan.totalEmis} EMIs` : "—"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {loan.emiAmount ? `${formatINR(loan.emiAmount)}/mo` : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusPill tone={statusTone(loan.status)} dot>{loan.status}</StatusPill>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {loan.createdAt ? format(new Date(loan.createdAt), "MMM d, yyyy") : "—"}
                  </TableCell>
                  {isAdmin && (() => {
                    // HR decides employees' loans; its own and HR/Admin staff
                    // loans go to an Admin or the Super Admin (QA-AUTH-04). Say
                    // so instead of leaving the cell blank (INFO-hr-cannot-approve-loans).
                    const duty = canDecideRequest(
                      { id: session?.user?.id, role: session?.user?.role },
                      { id: loan.userId, role: loan.user?.role },
                    );
                    return (
                    <TableCell className="text-right">
                      {!duty.allowed ? (
                        loan.status === "PENDING" || loan.status === "APPROVED" || loan.status === "ACTIVE" ? (
                          <span className="text-xs text-muted-foreground" title={duty.message}>
                            {loan.userId === session?.user?.id ? "Your request" : "Admin decides"}
                          </span>
                        ) : null
                      ) : loan.status === "PENDING" ? (
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" onClick={() => handleApprove(loan.id)} disabled={process.isPending}>
                            <CheckCircle2 className="size-4" aria-hidden="true" />Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setRejectId(loan.id)}>
                            <XCircle className="size-4" aria-hidden="true" />Reject
                          </Button>
                        </div>
                      ) : loan.status === "APPROVED" ? (
                        <div className="flex justify-end">
                          <Button size="sm" variant="outline" onClick={() => setDisburseId(loan.id)} disabled={process.isPending}>
                            <IndianRupee className="size-4" aria-hidden="true" />Mark disbursed
                          </Button>
                        </div>
                      ) : loan.status === "ACTIVE" ? (
                        <div className="flex justify-end">
                          <Button size="sm" variant="outline" onClick={() => setRepaidId(loan.id)} disabled={process.isPending}>
                            <CheckCircle2 className="size-4" aria-hidden="true" />Mark repaid
                          </Button>
                        </div>
                      ) : null}
                    </TableCell>
                    );
                  })()}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Request salary loan" onSubmit={handleCreate} submitLabel="Submit" isPending={create.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="loan-amount">Loan Amount</label>
          <Input
            id="loan-amount"
            type="number"
            min={1}
            max={MAX_LOAN_AMOUNT}
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={fieldErrors.amount ? true : undefined}
            aria-describedby={fieldErrors.amount ? "loan-amount-error" : undefined}
          />
          {fieldErrors.amount && <p id="loan-amount-error" className="text-xs text-destructive">{fieldErrors.amount}</p>}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium" htmlFor="loan-reason">Reason</label>
            <span className="text-2xs text-muted-foreground tabular-nums">{reason.length}/{LOAN_REASON_MAX}</span>
          </div>
          <Textarea
            id="loan-reason"
            placeholder="Why do you need this loan?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={LOAN_REASON_MAX}
            aria-invalid={fieldErrors.reason ? true : undefined}
            aria-describedby={fieldErrors.reason ? "loan-reason-error" : undefined}
          />
          {fieldErrors.reason && <p id="loan-reason-error" className="text-xs text-destructive">{fieldErrors.reason}</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="loan-emis">Number of EMIs</label>
          <Input
            id="loan-emis"
            type="number"
            min={1}
            max={MAX_LOAN_EMIS}
            step={1}
            placeholder="6"
            value={totalEmis}
            onChange={(e) => setTotalEmis(e.target.value)}
            aria-invalid={fieldErrors.totalEmis ? true : undefined}
            aria-describedby={fieldErrors.totalEmis ? "loan-emis-error" : "loan-emis-hint"}
          />
          {fieldErrors.totalEmis ? (
            <p id="loan-emis-error" className="text-xs text-destructive">{fieldErrors.totalEmis}</p>
          ) : (
            <p id="loan-emis-hint" className="text-xs text-muted-foreground">Up to {MAX_LOAN_EMIS} monthly instalments.</p>
          )}
        </div>
      </HrSheet>

      <ConfirmActionDialog
        open={rejectId !== null}
        onOpenChange={(open) => { if (!open) setRejectId(null); }}
        title="Reject loan"
        description="Are you sure you want to reject this loan request?"
        confirmLabel="Reject"
        variant="destructive"
        onConfirm={handleReject}
        isPending={process.isPending}
      />

      {/* The lifecycle after approval was a dead end in the UI (QA-0044). */}
      <ConfirmActionDialog
        open={disburseId !== null}
        onOpenChange={(open) => { if (!open) setDisburseId(null); }}
        title="Mark loan as disbursed"
        description="Record that the approved loan has been paid out. EMI recovery starts from the next payroll."
        confirmLabel="Mark disbursed"
        variant="default"
        onConfirm={() => disburseId && handleTransition(disburseId, "ACTIVE", () => setDisburseId(null), "Loan marked as disbursed")}
        isPending={process.isPending}
      />

      <ConfirmActionDialog
        open={repaidId !== null}
        onOpenChange={(open) => { if (!open) setRepaidId(null); }}
        title="Mark loan as repaid"
        description="Close this loan. No further EMIs will be recovered."
        confirmLabel="Mark repaid"
        variant="default"
        onConfirm={() => repaidId && handleTransition(repaidId, "REPAID", () => setRepaidId(null), "Loan closed")}
        isPending={process.isPending}
      />
    </PageWrapper>
  );
}
