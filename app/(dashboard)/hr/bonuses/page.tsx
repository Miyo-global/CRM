"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import { usePaginationParams } from "@/hooks/use-pagination-params";
import { clampPageSize, type PageSizeOption } from "@/lib/pagination-constants";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BonusEmployeePicker } from "@/features/hr/bonuses/bonus-employee-picker";
import { BonusStatsCards } from "@/features/hr/bonuses/bonus-stats";
import { BonusTable } from "@/features/hr/bonuses/bonus-table";
import { BonusExportSheet } from "@/features/hr/bonuses/bonus-export-sheet";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { BonusListFiltersBar } from "@/features/hr/bonuses/bonus-list-filters";
import type { Employee } from "@/types/hr";
import {
  applyBonusFilters,
  computeBonusStats,
  countActiveBonusFilters,
  parseBonusFiltersFromParams,
  type BonusRow,
} from "@/lib/hr/bonus-filters";
import {
  BONUS_MAX_AMOUNT_LABEL,
  BONUS_OTHER_REASON_MAX,
  BONUS_TYPE_LABELS,
  BONUS_TYPE_VALUES,
  type BonusType,
  bonusAmountInputError,
  bonusOtherReasonInputError,
  isBonusType,
  sanitizeBonusAmountInput,
  sanitizeBonusOtherReasonInput,
  validateCreateBonusForm,
} from "@/lib/validations/bonus";

interface CreateBonusPayload {
  userId: string;
  amount: number;
  type: BonusType;
  reason?: string;
}

const bonusKeys = { all: [...queryKeys.hr.all, "bonuses"] as const, list: () => [...bonusKeys.all, "list"] as const };

const BONUS_TYPES = BONUS_TYPE_VALUES.map((value) => ({
  value,
  label: BONUS_TYPE_LABELS[value],
}));

type StatusAction = "APPROVED" | "PAID" | "CANCELLED";

const STATUS_ACTIONS: Record<StatusAction, { title: string; description: string; label: string; done: string }> = {
  APPROVED: { title: "Approve bonus", description: "Approve this bonus for payment?", label: "Approve", done: "Bonus approved." },
  PAID: { title: "Mark bonus as paid", description: "Confirm that this bonus has been disbursed to the employee?", label: "Mark Paid", done: "Bonus marked as paid." },
  CANCELLED: { title: "Cancel bonus", description: "Cancel this bonus? It will not be paid.", label: "Cancel bonus", done: "Bonus cancelled." },
};

const BLOCKED_AMOUNT_KEYS = new Set(["e", "E", "+", "-", "Subtract", "Add", ","]);

function BonusContent() {
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => parseBonusFiltersFromParams(searchParams), [searchParams]);
  const { page, pageSize, setPage, setPageSize } = usePaginationParams();

  const { data: employeesRaw } = useHrEmployees();
  const employees = useMemo(
    () => (Array.isArray(employeesRaw) ? employeesRaw : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[],
    [employeesRaw],
  );

  const { data: bonuses, isLoading, isError, error, refetch } = useQuery({
    queryKey: bonusKeys.list(),
    queryFn: () => apiClient.get<BonusRow[]>("/hr/bonuses"),
  });

  const create = useMutation({
    mutationFn: (data: CreateBonusPayload) => apiClient.post<BonusRow>("/hr/bonuses", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: bonusKeys.list() }),
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }: { id: number; status?: StatusAction; amount?: number; type?: BonusType; reason?: string }) =>
      apiClient.patch<{
        employeeEmailSent?: boolean;
        stakeholderEmailsSent?: number;
      }>(`/hr/bonuses/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: bonusKeys.list() }),
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportTab, setExportTab] = useState<"download" | "email">("download");
  const [pendingAction, setPendingAction] = useState<{ id: number; status: StatusAction } | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<BonusType>("PERFORMANCE");
  const [reason, setReason] = useState("");

  const setFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === "ALL") params.delete(key);
      else params.set(key, value);
      params.delete("page");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    ["q", "status", "type", "userId", "dateFrom", "dateTo", "page"].forEach((key) => params.delete(key));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const filteredBonuses = useMemo(
    () => applyBonusFilters(bonuses ?? [], filters),
    [bonuses, filters],
  );

  const allStats = useMemo(() => computeBonusStats(bonuses ?? []), [bonuses]);
  const activeFilterCount = countActiveBonusFilters(filters);
  const totalPages = Math.max(1, Math.ceil(filteredBonuses.length / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages, setPage]);

  const resetForm = useCallback(() => {
    setEditId(null);
    setUserId("");
    setAmount("");
    setType("PERFORMANCE");
    setReason("");
  }, []);

  const handleAmountKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "." && !e.currentTarget.value.includes(".")) return;
    if (BLOCKED_AMOUNT_KEYS.has(e.key) || e.key === "-" || e.key === "Minus") {
      e.preventDefault();
    }
  }, []);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(sanitizeBonusAmountInput(e.target.value));
  }, []);

  const handleAmountPaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    setAmount(sanitizeBonusAmountInput(e.clipboardData.getData("text")));
  }, []);

  const amountError = useMemo(() => bonusAmountInputError(amount), [amount]);
  const reasonFormatError = useMemo(
    () => bonusOtherReasonInputError(reason, type === "OTHER"),
    [type, reason],
  );

  const canSubmit = useMemo(() => {
    const result = validateCreateBonusForm({ userId, amount, type, reason });
    return result.ok;
  }, [userId, amount, type, reason]);

  const handleTypeChange = useCallback((value: string) => {
    if (!isBonusType(value)) {
      toast.error("Please select a valid bonus type");
      return;
    }
    setType(value);
  }, []);

  const handleReasonChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setReason(sanitizeBonusOtherReasonInput(e.target.value));
  }, []);

  const handleCreate = useCallback(() => {
    const result = validateCreateBonusForm({ userId, amount, type, reason });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    const payload: CreateBonusPayload = {
      userId: result.data.userId,
      amount: result.data.amount,
      type: result.data.type,
      reason: result.data.reason ?? "",
    };

    if (editId !== null) {
      update.mutate(
        { id: editId, amount: payload.amount, type: payload.type, reason: payload.reason },
        {
          onSuccess: () => {
            toast.success("Bonus updated");
            setSheetOpen(false);
            resetForm();
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
      return;
    }

    create.mutate(
      payload,
      {
        onSuccess: () => {
          toast.success("Bonus created");
          setSheetOpen(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [userId, amount, type, reason, create, update, editId, resetForm]);

  const handleEdit = useCallback((bonus: BonusRow) => {
    setEditId(bonus.id);
    setUserId(bonus.userId);
    setAmount(String(Number(bonus.amount)));
    setType(isBonusType(bonus.type ?? "") ? (bonus.type as BonusType) : "PERFORMANCE");
    setReason(bonus.reason ?? "");
    setSheetOpen(true);
  }, []);

  const handleConfirmAction = useCallback(() => {
    if (!pendingAction) return;
    update.mutate(pendingAction, {
      onSuccess: (data) => {
        const notified =
          data?.employeeEmailSent
            ? " Employee and HR have been notified by email."
            : "";
        toast.success(`${STATUS_ACTIONS[pendingAction.status].done}${pendingAction.status === "PAID" ? notified : ""}`);
        setPendingAction(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [pendingAction, update]);

  if (isLoading) {
    return (
      <PageWrapper title="Bonuses">
        <div className="space-y-4">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Bonus processing"
      badge={`${bonuses?.length ?? 0} bonuses`}
      stickyHeader
      actions={
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Add Bonus
        </Button>
      }
      filters={
        <BonusListFiltersBar
          filters={filters}
          employees={employees}
          bonusTypes={BONUS_TYPES}
          activeFilterCount={activeFilterCount}
          exportDisabled={filteredBonuses.length === 0}
          onSearchChange={(value) => setFilter("q", value || null)}
          onStatusChange={(value) => setFilter("status", value)}
          onTypeChange={(value) => setFilter("type", value)}
          onUserIdChange={(value) => setFilter("userId", value)}
          onDateFromChange={(value) => setFilter("dateFrom", value || null)}
          onDateToChange={(value) => setFilter("dateTo", value || null)}
          onExport={() => { setExportTab("download"); setExportOpen(true); }}
          onMail={() => { setExportTab("email"); setExportOpen(true); }}
          onClearFilters={clearFilters}
        />
      }
    >
      {isError ? (
        <QueryErrorState title="Couldn't load bonuses" error={error} onRetry={() => refetch()} />
      ) : (
      <div className="space-y-4">
        <BonusStatsCards stats={allStats} />
        <BonusTable
          onClearFilters={clearFilters}
          rows={filteredBonuses}
          page={safePage}
          pageSize={pageSize}
          total={filteredBonuses.length}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={(size) => setPageSize(clampPageSize(size as PageSizeOption))}
          onApprove={(id) => setPendingAction({ id, status: "APPROVED" })}
          onMarkPaid={(id) => setPendingAction({ id, status: "PAID" })}
          onEdit={handleEdit}
          onCancel={(id) => setPendingAction({ id, status: "CANCELLED" })}
          hasActiveFilters={activeFilterCount > 0}
        />
      </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={(o) => { setSheetOpen(o); if (!o) resetForm(); }}
        title={editId !== null ? "Edit bonus" : "Add bonus"}
        onSubmit={handleCreate}
        submitLabel={editId !== null ? "Save" : "Create"}
        isPending={create.isPending || update.isPending}
        submitDisabled={!canSubmit || create.isPending || update.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="bonus-employee">Employee <span className="text-destructive">*</span></label>
          {editId !== null ? (
            <Input id="bonus-employee" value={bonuses?.find((b) => b.id === editId)?.employeeName ?? "Employee"} disabled />
          ) : (
            <BonusEmployeePicker
              employees={employees}
              value={userId}
              onValueChange={setUserId}
            />
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="bonus-amount">Amount <span className="text-destructive">*</span></label>
            <Input
              id="bonus-amount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={handleAmountChange}
              onKeyDown={handleAmountKeyDown}
              onPaste={handleAmountPaste}
              aria-invalid={amountError ? true : undefined}
              aria-describedby={amountError ? "bonus-amount-error" : "bonus-amount-hint"}
            />
            {amountError ? (
              <p id="bonus-amount-error" className="text-xs text-destructive">{amountError}</p>
            ) : (
              <p id="bonus-amount-hint" className="text-xs text-muted-foreground">
                Positive amount only, up to 2 decimals. Max {BONUS_MAX_AMOUNT_LABEL}.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="bonus-type">Type <span className="text-destructive">*</span></label>
            <Select value={type} onValueChange={handleTypeChange}>
              <SelectTrigger id="bonus-type"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent className="max-h-48">
                {BONUS_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="py-1.5 text-sm">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" htmlFor="bonus-reason">
                Reason / Notes {type === "OTHER" ? <span className="text-destructive">*</span> : null}
              </label>
              <span className="text-2xs text-muted-foreground">{reason.length}/{BONUS_OTHER_REASON_MAX}</span>
            </div>
            <Input
              id="bonus-reason"
              placeholder="Describe the bonus type"
              value={reason}
              onChange={handleReasonChange}
              maxLength={BONUS_OTHER_REASON_MAX}
              aria-invalid={reasonFormatError ? true : undefined}
              aria-describedby={reasonFormatError ? "bonus-reason-error" : "bonus-reason-hint"}
            />
            {reasonFormatError ? (
              <p id="bonus-reason-error" className="text-xs text-destructive">{reasonFormatError}</p>
            ) : (
              <p id="bonus-reason-hint" className="text-xs text-muted-foreground">
                {type === "OTHER" ? "Required" : "Optional"}. Up to {BONUS_OTHER_REASON_MAX} characters. Letters, numbers, spaces and - . &apos; only.
              </p>
            )}
        </div>
      </HrSheet>

      <BonusExportSheet
        open={exportOpen}
        onOpenChange={setExportOpen}
        defaultTab={exportTab}
        filters={filters}
        rows={filteredBonuses}
        canEmailExport
      />

      <ConfirmActionDialog
        open={pendingAction !== null}
        onOpenChange={(open) => { if (!open) setPendingAction(null); }}
        title={pendingAction ? STATUS_ACTIONS[pendingAction.status].title : ""}
        description={pendingAction ? STATUS_ACTIONS[pendingAction.status].description : ""}
        confirmLabel={pendingAction ? STATUS_ACTIONS[pendingAction.status].label : ""}
        variant={pendingAction?.status === "CANCELLED" ? "destructive" : "default"}
        onConfirm={handleConfirmAction}
        isPending={update.isPending}
      />
    </PageWrapper>
  );
}

export default function BonusesPage() {
  return (
    <DashboardGate allowedRoles={["HR", "CEO"]}>
      <BonusContent />
    </DashboardGate>
  );
}
