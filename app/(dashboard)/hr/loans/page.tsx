"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { formatINR } from "@/lib/format-utils";
import { isAdminOrOwner } from "@/lib/auth/role-guards";
import { useState, useCallback } from "react";
import {
  useSalaryLoans, useCreateSalaryLoan, useProcessSalaryLoan,
  type SalaryLoan,
} from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { IconChip } from "@/components/ui/icon-chip";
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
import { Plus, CheckCircle2, XCircle, Banknote } from "lucide-react";
import { useSession } from "next-auth/react";
import { EmptyExpensesIllustration } from "@/components/illustrations";
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

  const handleCreate = useCallback(() => {
    const amountNum = Number(amount);
    if (!amount || !Number.isFinite(amountNum) || amountNum <= 0 || amountNum > 100000000) { toast.error("Valid amount is required"); return; }
    if (!reason.trim()) { toast.error("Reason is required"); return; }
    const emisNum = Number(totalEmis);
    if (!Number.isInteger(emisNum) || emisNum < 1 || emisNum > 120) { toast.error("EMIs must be a whole number between 1 and 120"); return; }
    create.mutate(
      { amount: amountNum, reason: reason.trim(), totalEmis: emisNum },
      {
        onSuccess: () => {
          toast.success("Loan request submitted");
          setSheetOpen(false); setAmount(""); setReason(""); setTotalEmis("6");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [amount, reason, totalEmis, create]);

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
      <PageWrapper title="Salary Loans" subtitle="Loan requests and repayment tracking">
        <Skeleton className="h-80 rounded-lg" />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Salary Loans"
      subtitle="Request salary advances and track repayments"
      badge={`${loans?.length ?? 0} loans`}
      actions={<Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="size-4" aria-hidden="true" />Request Loan</Button>}
    >
      {isError ? (
        <QueryErrorState title="Couldn't load salary loans" error={error} onRetry={() => refetch()} />
      ) : !loans?.length ? (
        <EmptyState
          illustration={<EmptyExpensesIllustration />}
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
                <TableRow key={loan.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <IconChip icon={Banknote} size="sm" tone="neutral" />
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
                  {isAdmin && (
                    <TableCell className="text-right">
                      {loan.status === "PENDING" && loan.user?.id !== session?.user?.id ? (
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" onClick={() => handleApprove(loan.id)} disabled={process.isPending}>
                            <CheckCircle2 className="size-4" aria-hidden="true" />Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setRejectId(loan.id)}>
                            <XCircle className="size-4" aria-hidden="true" />Reject
                          </Button>
                        </div>
                      ) : null}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Request Salary Loan" onSubmit={handleCreate} submitLabel="Submit" isPending={create.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Loan Amount</label>
          <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Reason</label>
          <Textarea placeholder="Why do you need this loan?" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Number of EMIs</label>
          <Input type="number" placeholder="6" value={totalEmis} onChange={(e) => setTotalEmis(e.target.value)} />
        </div>
      </HrSheet>

      <ConfirmActionDialog
        open={rejectId !== null}
        onOpenChange={(open) => { if (!open) setRejectId(null); }}
        title="Reject Loan"
        description="Are you sure you want to reject this loan request?"
        confirmLabel="Reject"
        variant="destructive"
        onConfirm={handleReject}
        isPending={process.isPending}
      />
    </PageWrapper>
  );
}
