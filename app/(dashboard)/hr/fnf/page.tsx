"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, FileSpreadsheet, DollarSign, CheckCircle2, Clock } from "lucide-react";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";

interface FnfSettlement {
  id: number; userId: string; employeeName: string | null; lastWorkingDate: string | null;
  grossPay: string | null; deductions: string | null; netPay: string | null;
  status: string | null; notes: string | null; createdAt: string | null;
}

const fnfKeys = { all: [...queryKeys.hr.all, "fnf"] as const, list: () => [...fnfKeys.all, "list"] as const };

function statusBadge(s: string | null): "default" | "secondary" | "outline" {
  if (s === "COMPLETED") return "default";
  if (s === "IN_PROGRESS") return "secondary";
  return "outline";
}

function FnfContent() {
  const qc = useQueryClient();
  const { data: items, isLoading } = useQuery({
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
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Full & Final Settlement"
      subtitle="Process employee exit settlements"
      badge={`${items?.length ?? 0} settlements`}
      actions={<Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />New Settlement</Button>}
    >
      {!items?.length ? (
        <EmptyState
          illustration={<EmptyExpensesIllustration className="h-32 w-32 opacity-95" />}
          title="No FnF settlements"
          description="Exit settlements you process will appear here."
          action={{ label: "New Settlement", onClick: () => setSheetOpen(true) }}
        />
      ) : (
        <div className="space-y-2">
          {items.map((f: FnfSettlement) => (
            <Card key={f.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{f.employeeName ?? "Employee"}</p>
                    <Badge variant={statusBadge(f.status)} className="text-[10px]">{f.status ?? "PENDING"}</Badge>
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                    {f.netPay && <span className="font-medium text-foreground">Net: ${Number(f.netPay).toLocaleString()}</span>}
                    {f.grossPay && <span>Gross: ${Number(f.grossPay).toLocaleString()}</span>}
                    {f.deductions && <span>Ded: ${Number(f.deductions).toLocaleString()}</span>}
                    {f.lastWorkingDate && <span>{format(new Date(f.lastWorkingDate), "MMM d, yyyy")}</span>}
                  </div>
                </div>
                {f.status !== "COMPLETED" && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCompleteId(f.id)}>
                    <CheckCircle2 className="h-3 w-3 mr-1" />Complete
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
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
        <div className="grid grid-cols-2 gap-3">
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
