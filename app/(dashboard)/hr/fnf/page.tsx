"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
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
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, IndianRupee, CheckCircle2 } from "lucide-react";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { formatINRWhole } from "@/lib/format-utils";

interface FnfSettlement {
  id: number; userId: string; employeeName: string | null; lastWorkingDate: string | null;
  grossPay: string | null; deductions: string | null; netPay: string | null;
  status: string | null; notes: string | null; createdAt: string | null;
}

const fnfKeys = { all: [...queryKeys.hr.all, "fnf"] as const, list: () => [...fnfKeys.all, "list"] as const };

function statusTone(s: string | null): Tone {
  if (s === "COMPLETED") return "success";
  if (s === "IN_PROGRESS") return "info";
  return "warning";
}

function money(v: string | null) {
  return v ? formatINRWhole(v) : "—";
}

function FnfContent() {
  const qc = useQueryClient();
  const { data: items, isLoading, isError, error, refetch } = useQuery({
    queryKey: fnfKeys.list(),
    queryFn: () => apiClient.get<FnfSettlement[]>("/hr/fnf"),
  });

  const create = useMutation({
    mutationFn: (data: { userId: string; lastWorkingDate?: string; grossPay?: number; deductions?: number; notes?: string }) =>
      apiClient.post<FnfSettlement>("/hr/fnf", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: fnfKeys.list() }),
  });

  const complete = useMutation({
    mutationFn: (id: number) => apiClient.patch<{ success: boolean }>(`/hr/fnf/${id}`, { status: "COMPLETED" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: fnfKeys.list() }),
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [completeId, setCompleteId] = useState<number | null>(null);
  const [userId, setUserId] = useState("");
  const [lwd, setLwd] = useState("");
  const [grossPay, setGrossPay] = useState("");
  const [deductions, setDeductions] = useState("");
  const [notes, setNotes] = useState("");

  const handleCreate = useCallback(() => {
    if (!userId.trim()) { toast.error("Employee ID is required"); return; }
    create.mutate(
      { userId: userId.trim(), lastWorkingDate: lwd || undefined, grossPay: Number(grossPay) || undefined, deductions: Number(deductions) || undefined, notes: notes || undefined },
      {
        onSuccess: () => {
          toast.success("FnF settlement created"); setSheetOpen(false);
          setUserId(""); setLwd(""); setGrossPay(""); setDeductions(""); setNotes("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [userId, lwd, grossPay, deductions, notes, create]);

  const handleComplete = useCallback(() => {
    if (!completeId) return;
    complete.mutate(completeId, {
      onSuccess: () => { toast.success("Settlement completed"); setCompleteId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [completeId, complete]);

  if (isLoading) {
    return (
      <PageWrapper title="Full & Final" subtitle="Employee settlement processing">
        <Skeleton className="h-80 rounded-lg" />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Full & Final Settlement"
      subtitle="Process employee exit settlements"
      badge={`${items?.length ?? 0} settlements`}
      actions={<Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="size-4" aria-hidden="true" />New Settlement</Button>}
    >
      {isError ? (
        <QueryErrorState title="Couldn't load settlements" error={error} onRetry={() => refetch()} />
      ) : !items?.length ? (
        <EmptyState
          illustration={<EmptyExpensesIllustration />}
          title="No FnF settlements"
          description="Exit settlements you process will appear here."
          action={{ label: "New Settlement", onClick: () => setSheetOpen(true) }}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table className="min-w-[760px] tabular-nums">
            <caption className="sr-only">Full and final settlements</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Last working day</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((f: FnfSettlement) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <IconChip icon={IndianRupee} size="sm" tone="neutral" />
                      <span className="text-sm font-medium">{f.employeeName ?? "Employee"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {f.lastWorkingDate ? format(new Date(f.lastWorkingDate), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{money(f.grossPay)}</TableCell>
                  <TableCell className="text-right text-danger-strong">{money(f.deductions)}</TableCell>
                  <TableCell className="text-right font-semibold">{money(f.netPay)}</TableCell>
                  <TableCell>
                    <StatusPill tone={statusTone(f.status)} dot>{f.status ?? "PENDING"}</StatusPill>
                  </TableCell>
                  <TableCell className="text-right">
                    {f.status !== "COMPLETED" && (
                      <Button size="sm" variant="outline" onClick={() => setCompleteId(f.id)}>
                        <CheckCircle2 className="size-4" aria-hidden="true" />Complete
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="New FnF Settlement" onSubmit={handleCreate} submitLabel="Create" isPending={create.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee User ID</label>
          <Input placeholder="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Last Working Date</label>
          <Input type="date" value={lwd} onChange={(e) => setLwd(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Gross Pay</label>
            <Input type="number" placeholder="0.00" value={grossPay} onChange={(e) => setGrossPay(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Deductions</label>
            <Input type="number" placeholder="0.00" value={deductions} onChange={(e) => setDeductions(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes</label>
          <Textarea placeholder="Additional details..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
      </HrSheet>

      <ConfirmActionDialog
        open={completeId !== null}
        onOpenChange={(open) => { if (!open) setCompleteId(null); }}
        title="Complete Settlement"
        description="Mark this FnF settlement as completed? This action cannot be undone."
        confirmLabel="Complete"
        variant="default"
        onConfirm={handleComplete}
        isPending={complete.isPending}
      />
    </PageWrapper>
  );
}

export default function FnfPage() {
  return (
    <DashboardGate allowedRoles={["HR"]}>
      <FnfContent />
    </DashboardGate>
  );
}
