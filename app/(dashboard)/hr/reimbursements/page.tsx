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
import { Plus, CheckCircle2, XCircle, IndianRupee } from "lucide-react";
import { useSession } from "next-auth/react";
import { EmptyState } from "@/components/ui/empty-state";
import { isAdminOrOwner } from "@/lib/constants/roles";
import { formatINRWhole } from "@/lib/format-utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  const [rejectReason, setRejectReason] = useState("");
  const [payId, setPayId] = useState<number | null>(null);

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
    // The reason is recorded, not discarded (QA-0044).
    process.mutate({ id: rejectId, status: "REJECTED", rejectionReason: rejectReason.trim() }, {
      onSuccess: () => {
        toast.success("Reimbursement rejected");
        setRejectId(null);
        setRejectReason("");
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [rejectId, rejectReason, process]);

  const handleMarkPaid = useCallback(() => {
    if (!payId) return;
    process.mutate({ id: payId, status: "PAID" }, {
      onSuccess: () => { toast.success("Marked as paid"); setPayId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [payId, process]);

  if (isLoading) {
    return (
      <PageWrapper title="Reimbursements">
        <Skeleton className="h-80 rounded-lg" />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Reimbursements"
      badge={`${items?.length ?? 0} requests`}
      actions={<Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="size-4" aria-hidden="true" />New request</Button>}
    >
      {isError ? (
        <QueryErrorState title="Couldn't load reimbursements" error={error} onRetry={() => refetch()} />
      ) : !items?.length ? (
        <EmptyState
          title="No reimbursement requests yet"
          description="Submit an expense to start tracking reimbursement requests."
          action={{ label: "New request", onClick: () => setSheetOpen(true) }}
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
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{r.category}</p>
                        <p className="max-w-64 truncate text-xs text-muted-foreground" title={r.description ?? undefined}>
                          {[r.user?.name, r.description].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold tabular-nums">{formatINRWhole(r.amount)}</TableCell>
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
                      ) : r.status === "APPROVED" ? (
                        <div className="flex justify-end">
                          <Button size="sm" variant="outline" onClick={() => setPayId(r.id)} disabled={process.isPending}>
                            <IndianRupee className="size-4" aria-hidden="true" />Mark paid
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
        title="Submit reimbursement"
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
        onOpenChange={(open) => { if (!open) { setRejectId(null); setRejectReason(""); } }}
        title="Reject reimbursement"
        description="The employee sees this reason on their request."
        confirmLabel="Reject"
        variant="destructive"
        onConfirm={handleReject}
        isPending={process.isPending}
        confirmDisabled={rejectReason.trim().length === 0}
      >
        <div className="space-y-1.5 py-1">
          <Label htmlFor="reimbursement-reject-reason">Reason</Label>
          <Textarea
            id="reimbursement-reject-reason"
            value={rejectReason}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectReason(e.target.value)}
            placeholder="Why is this request rejected?"
            rows={3}
            maxLength={500}
          />
        </div>
      </ConfirmActionDialog>

      <ConfirmActionDialog
        open={payId !== null}
        onOpenChange={(open) => { if (!open) setPayId(null); }}
        title="Mark reimbursement as paid"
        description="Record that this approved reimbursement has been paid out."
        confirmLabel="Mark paid"
        variant="default"
        onConfirm={handleMarkPaid}
        isPending={process.isPending}
      />
    </PageWrapper>
  );
}


