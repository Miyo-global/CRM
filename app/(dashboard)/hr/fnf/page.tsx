"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Tone } from "@/lib/design/tones";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, CheckCircle2, Pencil } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatINRWhole } from "@/lib/format-utils";
import { parseCalendarDate } from "@/lib/date-utils";
import { fnfHasFigures } from "@/lib/hr/fnf-figures";

interface FnfSettlement {
  id: number; userId: string; employeeName: string | null; lastWorkingDate: string | null;
  basicDues: string | null; leaveEncashment: string | null; bonusDue: string | null;
  deductions: string | null; loanRecovery: string | null;
  grossPay: string | null; totalDeductions: string | null; netPay: string | null;
  status: string | null; notes: string | null; createdAt: string | null;
}

type Figures = { basicDues: string; leaveEncashment: string; bonusDue: string; deductions: string; loanRecovery: string };
const EMPTY_FIGURES: Figures = { basicDues: "", leaveEncashment: "", bonusDue: "", deductions: "", loanRecovery: "" };
const FIGURE_FIELDS: { key: keyof Figures; label: string }[] = [
  { key: "basicDues", label: "Salary dues" },
  { key: "leaveEncashment", label: "Leave encashment" },
  { key: "bonusDue", label: "Bonus due" },
  { key: "deductions", label: "Deductions" },
  { key: "loanRecovery", label: "Loan recovery" },
];
const toNumbers = (f: Figures) =>
  Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v === "" ? undefined : Number(v)])) as Record<keyof Figures, number | undefined>;

const fnfKeys = {
  all: [...queryKeys.hr.all, "fnf"] as const,
  list: () => [...fnfKeys.all, "list"] as const,
  eligible: () => [...fnfKeys.all, "eligible"] as const,
};

/** A `?fields=picker`-shaped person (lib/hr/directory-view.ts toPickerEntry). */
interface PickerPerson {
  id: string; name: string | null; firstName?: string | null; lastName?: string | null;
  designation?: string | null; department?: string | null; email?: string | null;
}
const personLabel = (p: PickerPerson) =>
  p.name || [p.firstName, p.lastName].filter(Boolean).join(" ") || p.email || "Employee";

function statusTone(s: string | null): Tone {
  if (s === "PAID") return "success";
  if (s === "APPROVED" || s === "PENDING_APPROVAL") return "info";
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
    mutationFn: (data: { userId: string; notes?: string } & Record<keyof Figures, number | undefined>) =>
      apiClient.post<FnfSettlement>("/hr/fnf", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: fnfKeys.all }),
  });

  // The enum has no COMPLETED; PAID is the final state (the old call 400'd).
  const complete = useMutation({
    mutationFn: (id: number) => apiClient.patch<{ success: boolean }>(`/hr/fnf/${id}`, { status: "PAID" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: fnfKeys.list() }),
  });

  const saveFigures = useMutation({
    mutationFn: ({ id, ...data }: { id: number; notes?: string } & Record<keyof Figures, number | undefined>) =>
      apiClient.patch<FnfSettlement>(`/hr/fnf/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: fnfKeys.list() }),
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<FnfSettlement | null>(null);
  // Only people with a resignation or termination and no settlement yet.
  const eligible = useQuery({
    queryKey: fnfKeys.eligible(),
    queryFn: () => apiClient.get<PickerPerson[]>("/hr/fnf/eligible"),
    enabled: sheetOpen && !editing,
  });
  const [completeId, setCompleteId] = useState<number | null>(null);
  const [userId, setUserId] = useState("");
  const [figures, setFigures] = useState<Figures>(EMPTY_FIGURES);
  const [notes, setNotes] = useState("");

  const closeSheet = useCallback(() => {
    setSheetOpen(false); setEditing(null);
    setUserId(""); setFigures(EMPTY_FIGURES); setNotes("");
  }, []);

  const openEdit = useCallback((f: FnfSettlement) => {
    const v = (x: string | null) => (x && Number(x) !== 0 ? String(Number(x)) : "");
    setEditing(f);
    setFigures({ basicDues: v(f.basicDues), leaveEncashment: v(f.leaveEncashment), bonusDue: v(f.bonusDue), deductions: v(f.deductions), loanRecovery: v(f.loanRecovery) });
    setNotes(f.notes ?? "");
    setSheetOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    const nums = toNumbers(figures);
    if (Object.values(nums).some((x) => x !== undefined && (!Number.isFinite(x) || x < 0))) {
      toast.error("Amounts must be zero or more"); return;
    }
    const handlers = {
      onSuccess: () => { toast.success(editing ? "Settlement figures saved" : "FnF settlement created"); closeSheet(); },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
    };
    if (editing) {
      saveFigures.mutate({ id: editing.id, ...nums, notes: notes || undefined }, handlers);
      return;
    }
    if (!userId) { toast.error("Select an employee"); return; }
    create.mutate({ userId, ...nums, notes: notes || undefined }, handlers);
  }, [editing, userId, figures, notes, create, saveFigures, closeSheet]);

  const handleComplete = useCallback(() => {
    if (!completeId) return;
    complete.mutate(completeId, {
      onSuccess: () => { toast.success("Settlement completed"); setCompleteId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [completeId, complete]);

  if (isLoading) {
    return (
      <PageWrapper title="Full & final">
        <Skeleton className="h-80 rounded-lg" />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Full & final settlement"
      badge={`${items?.length ?? 0} settlements`}
      actions={<Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="size-4" aria-hidden="true" />New Settlement</Button>}
    >
      {isError ? (
        <QueryErrorState title="Couldn't load settlements" error={error} onRetry={() => refetch()} />
      ) : !items?.length ? (
        <EmptyState
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
                      <span className="text-sm font-medium">{f.employeeName ?? "Employee"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {f.lastWorkingDate ? format(parseCalendarDate(f.lastWorkingDate), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{money(f.grossPay)}</TableCell>
                  <TableCell className="text-right text-danger-strong">{money(f.totalDeductions)}</TableCell>
                  <TableCell className="text-right font-semibold">{money(f.netPay)}</TableCell>
                  <TableCell>
                    <StatusPill tone={statusTone(f.status)} dot>{f.status ?? "PENDING"}</StatusPill>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      {f.status === "DRAFT" && (
                        <Button size="sm" variant="ghost" onClick={() => openEdit(f)}>
                          <Pencil className="size-4" aria-hidden="true" />Figures
                        </Button>
                      )}
                      {f.status !== "PAID" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCompleteId(f.id)}
                          disabled={!fnfHasFigures(f)}
                          title={fnfHasFigures(f) ? undefined : "Enter the settlement figures first"}
                        >
                          <CheckCircle2 className="size-4" aria-hidden="true" />Complete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={(open) => { if (!open) closeSheet(); else setSheetOpen(true); }}
        title={editing ? `Settlement figures: ${editing.employeeName ?? "Employee"}` : "New FnF settlement"}
        onSubmit={handleSave}
        submitLabel={editing ? "Save" : "Create"}
        isPending={create.isPending || saveFigures.isPending}
      >
        {!editing && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Employee <span className="text-destructive">*</span></label>
            <SearchableSelect
              aria-label="Employee"
              options={(eligible.data ?? []).map((p) => ({
                value: p.id,
                label: personLabel(p),
                keywords: [p.email, p.designation, p.department].filter(Boolean).join(" "),
              }))}
              value={userId}
              onValueChange={setUserId}
              disabled={eligible.isLoading}
              placeholder={eligible.isLoading ? "Loading…" : "Select employee"}
              searchPlaceholder="Search employees…"
              emptyText="No one with a resignation or termination is awaiting settlement."
            />
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {FIGURE_FIELDS.map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <label htmlFor={`fnf-${key}`} className="text-sm font-medium">{label}</label>
              <Input
                id={`fnf-${key}`}
                type="number"
                min="0"
                placeholder="0.00"
                value={figures[key]}
                onChange={(e) => setFigures((prev) => ({ ...prev, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes</label>
          <Textarea placeholder="Additional details..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
      </HrSheet>

      <ConfirmActionDialog
        open={completeId !== null}
        onOpenChange={(open) => { if (!open) setCompleteId(null); }}
        title="Complete settlement"
        description="Mark this FnF settlement as paid and completed? This action cannot be undone."
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
