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
import { useDealApprovals, useResolveDealApproval } from "@/lib/api/hooks/crm";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { EmptyApprovalIllustration } from "@/components/illustrations";
import { CURRENCY_SYMBOL, DEFAULT_LOCALE } from "@/lib/constants/locale";

function fmt(amount: string | number) {
  return `${CURRENCY_SYMBOL}${Number(amount).toLocaleString(DEFAULT_LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
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
  const { data, isLoading } = useDealApprovals({ status: statusFilter });
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
          <TabsList className="h-8">
            <TabsTrigger value="pending" className="text-xs px-3 h-7">Pending</TabsTrigger>
            <TabsTrigger value="approved" className="text-xs px-3 h-7">Approved</TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs px-3 h-7">Rejected</TabsTrigger>
            <TabsTrigger value="all" className="text-xs px-3 h-7">All</TabsTrigger>
          </TabsList>
        </Tabs>
      }
    >
      <div className="rounded-lg border border-border bg-card overflow-hidden">
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
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground"><div className="flex flex-col items-center justify-center gap-2 py-2">
                      <EmptyApprovalIllustration className="h-36 w-36 opacity-95" />
                      <p>No approvals found.</p>
                    </div></TableCell></TableRow>
                ) : items.map((a) => {
                  const badge = STATUS_BADGE[a.status] ?? { label: a.status, variant: "secondary" as const };
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium text-sm">{a.dealName ?? `Deal #${a.dealId}`}</TableCell>
                      <TableCell className="text-right text-sm">{a.dealValue ? fmt(a.dealValue) : ""}</TableCell>
                      <TableCell className="text-sm">{a.requesterName ?? ""}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[11px]">{a.requestedStage}</Badge></TableCell>
                      <TableCell><Badge variant={badge.variant} className="text-[11px]">{badge.label}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.createdAt ? format(new Date(a.createdAt), "dd MMM yyyy") : ""}</TableCell>
                      <TableCell className="text-right">
                        {a.status === "pending" && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-green-600 hover:text-green-700" onClick={() => setConfirmAction({ id: a.id, action: "approve" })}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approve
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => setConfirmAction({ id: a.id, action: "reject" })}>
                              <XCircle className="h-3.5 w-3.5 mr-1" />Reject
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
