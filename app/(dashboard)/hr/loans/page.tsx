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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Landmark, CheckCircle2, XCircle, Banknote } from "lucide-react";
import { useSession } from "next-auth/react";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";

function statusBadge(s: string | null): "default" | "secondary" | "outline" | "destructive" {
  if (s === "ACTIVE" || s === "REPAID") return "default";
  if (s === "APPROVED") return "secondary";
  if (s === "REJECTED") return "destructive";
  return "outline";
}

export default function LoansPage() {
  const { data: session } = useSession();
  const { data: loans, isLoading } = useSalaryLoans();
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
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Salary Loans"
      subtitle="Request salary advances and track repayments"
      badge={`${loans?.length ?? 0} loans`}
      actions={<Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />Request Loan</Button>}
    >
      {!loans?.length ? (
        <EmptyState
          illustration={<EmptyExpensesIllustration className="h-32 w-32 opacity-95" />}
          title="No salary loans"
          description="Approved and pending salary loans will appear here."
          action={{ label: "Request Loan", onClick: () => setSheetOpen(true) }}
        />
      ) : (
        <div className="space-y-2">
          {loans.map((loan: SalaryLoan) => (
            <Card key={loan.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <Banknote className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{formatINR(loan.amount)}</p>
                    <Badge variant={statusBadge(loan.status)} className="text-[10px]">{loan.status}</Badge>
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                    {loan.user?.name && <span>{loan.user.name}</span>}
                    {loan.totalEmis && <span>{loan.paidEmis ?? 0}/{loan.totalEmis} EMIs</span>}
                    {loan.emiAmount && <span>{formatINR(loan.emiAmount)}/mo</span>}
                    {loan.createdAt && <span>{format(new Date(loan.createdAt), "MMM d, yyyy")}</span>}
                  </div>
                  {loan.reason && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{loan.reason}</p>}
                </div>
                {isAdmin && loan.status === "PENDING" && loan.user?.id !== session?.user?.id && (
                  <div className="flex gap-1.5 shrink-0">
                    <Button size="sm" className="h-7 text-xs" onClick={() => handleApprove(loan.id)} disabled={process.isPending}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setRejectId(loan.id)}>
                      <XCircle className="h-3 w-3 mr-1" />Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
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
