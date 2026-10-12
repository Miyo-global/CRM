"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import {
  useReimbursements, useCreateReimbursement, useProcessReimbursement,
  type Reimbursement,
} from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { IconChip } from "@/components/ui/icon-chip";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Tone } from "@/lib/design/tones";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { ReimbursementRequestForm } from "@/features/hr/reimbursements/reimbursement-request-form";
import type { ReimbursementRequestFormValues } from "@/lib/validations/common-forms";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, CheckCircle2, XCircle, DollarSign } from "lucide-react";
import { useSession } from "next-auth/react";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { isAdminOrOwner } from "@/lib/constants/roles";

function statusTone(s: string | null): Tone {
  if (s === "APPROVED" || s === "PAID") return "success";
  if (s === "REJECTED") return "danger";
  return "warning";
}

export default function ReimbursementsPage() {
  const { data: session } = useSession();
  const { data: items, isLoading, isError, error, refetch } = useReimbursements();
  const create = useCreateReimbursement();
  const process = useProcessReimbursement();
  const isAdmin = isAdminOrOwner(session?.user?.role);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [rejectId, setRejectId] = useState<number | null>(null);

  const handleCreate = useCallback(
    (values: ReimbursementRequestFormValues) => {
      create.mutate(
        {
          category: values.category,
          amount: values.amount,
          description: values.description || undefined,
          receiptUrl: values.receiptUrl || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Reimbursement submitted");
            setSheetOpen(false);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [create],
  );

  const handleApprove = useCallback((id: number) => {
    process.mutate({ id, status: "APPROVED" }, {
      onSuccess: () => toast.success("Approved"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [process]);

  const handleReject = useCallback(() => {
    if (!rejectId) return;
    process.mutate({ id: rejectId, status: "REJECTED" }, {
      onSuccess: () => { toast.success("Rejected"); setRejectId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [rejectId, process]);

  if (isLoading) {
    return (
      <PageWrapper title="Reimbursements" subtitle="Expense reimbursement requests">
        <Skeleton className="h-80 rounded-lg" />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Reimbursements"
      subtitle="Submit and track expense reimbursements"
      badge={`${items?.length ?? 0} requests`}
      actions={<Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="size-4" aria-hidden="true" />New Request</Button>}
    >
      {isError ? (
        <QueryErrorState title="Couldn't load reimbursements" error={error} onRetry={() => refetch()} />
      ) : !items?.length ? (
        <EmptyState
          illustration={<EmptyExpensesIllustration />}
          title="No reimbursement requests yet"
          description="Submit an expense to start tracking reimbursement requests."
          action={{ label: "New Request", onClick: () => setSheetOpen(true) }}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table className="min-w-[680px] tabular-nums">
            <caption className="sr-only">Reimbursement requests</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Request</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r: Reimbursement) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <IconChip icon={DollarSign} size="sm" tone="neutral" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{r.category}</p>
                        <p className="max-w-64 truncate text-xs text-muted-foreground" title={r.description ?? undefined}>
                          {[r.user?.name, r.description].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">${Number(r.amount).toLocaleString()}</TableCell>
                  <TableCell>
                    <StatusPill tone={statusTone(r.status)} dot>{r.status}</StatusPill>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {r.createdAt ? format(new Date(r.createdAt), "MMM d, yyyy") : "—"}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      {r.status === "PENDING" ? (
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" onClick={() => handleApprove(r.id)} disabled={process.isPending}>
                            <CheckCircle2 className="size-4" aria-hidden="true" />Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setRejectId(r.id)}>
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

      <HrSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Submit Reimbursement"
        showSubmit={false}
        footer={
          <div className="flex justify-end gap-2 py-1">
            <Button variant="ghost" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="reimbursement-request" loading={create.isPending}>
              {create.isPending ? "Submitting..." : "Submit"}
            </Button>
          </div>
        }
      >
        <ReimbursementRequestForm formId="reimbursement-request" onSubmit={handleCreate} />
      </HrSheet>

      <ConfirmActionDialog
        open={rejectId !== null}
        onOpenChange={(open) => { if (!open) setRejectId(null); }}
        title="Reject Reimbursement"
        description="Are you sure you want to reject this reimbursement request?"
        confirmLabel="Reject"
        variant="destructive"
        onConfirm={handleReject}
        isPending={process.isPending}
      />
    </PageWrapper>
  );
}


