"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import {
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageWrapper } from "@/components/ui/page-wrapper";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { QueryErrorState } from "@/components/ui/query-error-state";
import type { Tone } from "@/lib/design/tones";
import { useDealApprovals, useResolveDealApproval } from "@/lib/api/hooks/crm";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { EmptyApprovalIllustration } from "@/components/illustrations";
import { CURRENCY_SYMBOL, DEFAULT_LOCALE } from "@/lib/constants/locale";

function fmt(amount: string | number) {
  return `${CURRENCY_SYMBOL}${Number(amount).toLocaleString(DEFAULT_LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const STATUS_BADGE: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};

interface Approval {
  id: number; dealId: number; dealName: string | null; dealValue: string | null;
  requesterName: string | null; requestedStage: string; status: string;
  rejectionReason: string | null; createdAt: string | null; resolvedAt: string | null;
}

export default function DealApprovalsPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>("pending");
  const [confirmAction, setConfirmAction] = useState<{ id: number; action: "approve" | "reject" } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const { data, isLoading, isError, error, refetch } = useDealApprovals({ status: statusFilter });
  const resolve = useResolveDealApproval();

  const items: Approval[] = Array.isArray(data) ? (data as unknown as Approval[]) : [];

  const handleResolve = useCallback(() => {
    if (!confirmAction) return;
    resolve.mutate(
      { approvalId: confirmAction.id, action: confirmAction.action, rejectionReason: confirmAction.action === "reject" ? rejectionReason : undefined },
      {
        onSuccess: () => { toast.success(confirmAction.action === "approve" ? "Deal approved" : "Deal rejected"); setConfirmAction(null); setRejectionReason(""); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [confirmAction, rejectionReason, resolve]);

  return (
    <PageWrapper
      title="Deal Approvals"
      subtitle="Review and approve high-value deals"
      filters={
        <Tabs value={statusFilter ?? "all"} onValueChange={(v) => setStatusFilter(v === "all" ? undefined : v)}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      }
    >
      {isError ? (
        <QueryErrorState title="Couldn't load approvals" error={error} onRetry={() => refetch()} />
      ) : (
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <ScrollArea className="w-full" type="auto">
          <div className="min-w-[750px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={7} className="h-12"><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow className="hover:bg-transparent"><TableCell colSpan={7} className="p-4">
                    <EmptyState compact illustration={<EmptyApprovalIllustration />} title="No approvals found." className="border-0 bg-transparent" />
                  </TableCell></TableRow>
                ) : items.map((a) => {
                  const badge = STATUS_BADGE[a.status] ?? { label: a.status, tone: "neutral" as const };
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm font-medium"><Link href={`/crm/deals/${a.dealId}`} className="hover:text-brand-text hover:underline">{a.dealName ?? `Deal #${a.dealId}`}</Link></TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{a.dealValue ? fmt(a.dealValue) : ""}</TableCell>
                      <TableCell className="text-sm">{a.requesterName ?? ""}</TableCell>
                      <TableCell><Badge variant="secondary">{a.requestedStage}</Badge></TableCell>
                      <TableCell><StatusPill tone={badge.tone} dot>{badge.label}</StatusPill></TableCell>
                      <TableCell className="text-xs tabular-nums text-muted-foreground">{a.createdAt ? format(new Date(a.createdAt), "dd MMM yyyy") : ""}</TableCell>
                      <TableCell className="text-right">
                        {a.status === "pending" && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button size="xs" variant="ghost" className="text-success-strong hover:text-success-strong" onClick={() => setConfirmAction({ id: a.id, action: "approve" })}>
                              <CheckCircle2 />Approve
                            </Button>
                            <Button size="xs" variant="ghost" className="text-danger-strong hover:text-danger-strong" onClick={() => setConfirmAction({ id: a.id, action: "reject" })}>
                              <XCircle />Reject
                            </Button>
                          </div>
                        )}
                        {a.status === "rejected" && a.rejectionReason && (
                          <span className="text-xs text-muted-foreground italic" title={a.rejectionReason}>{a.rejectionReason.slice(0, 30)}{a.rejectionReason.length > 30 ? "..." : ""}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </div>
      )}

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.action === "approve" ? "Approve Deal?" : "Reject Deal?"}</AlertDialogTitle>
            <AlertDialogDescription>{confirmAction?.action === "approve" ? "This will move the deal to the requested stage." : "The requester will be notified of the rejection."}</AlertDialogDescription>
          </AlertDialogHeader>
          {confirmAction?.action === "reject" && (
            <div className="space-y-1.5 py-2">
              <label className="text-sm font-medium">Rejection Reason</label>
              <Textarea placeholder="Why is this deal being rejected?" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={3} />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResolve} disabled={resolve.isPending || (confirmAction?.action === "reject" && !rejectionReason.trim())}>
              {resolve.isPending ? "Processing..." : confirmAction?.action === "approve" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
