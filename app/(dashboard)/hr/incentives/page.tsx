"use client";
import { getErrorMessage } from "@/lib/get-error-message";

import { useState, useTransition, useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname, notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatsStrip } from "@/components/shared/stats-strip";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import type { Tone } from "@/lib/design/tones";
import { Skeleton } from "@/components/ui/skeleton";
import { IndianRupee, CheckCircle2, XCircle, Clock, Settings, TrendingUp, Users, History, ArrowRight } from "lucide-react";
import {
  useHrIncentiveStats,
  useHrIncentives,
  useHrIncentiveConfigs,
  useHrIncentiveConfigHistory,
  useApproveIncentive,
  useRejectIncentive,
  useSetIncentiveConfig,
} from "@/lib/api/hooks/hr";
import { HrSheet } from "@/features/hr/hr-sheet";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { type PageSizeOption } from "@/lib/pagination-constants";
import { toast } from "sonner";
import { formatINRWhole as formatINR } from "@/lib/format-utils";
import {
  incentiveRateInputError,
  normalizeIncentiveRateString,
  sanitizeIncentiveRateInput,
} from "@/lib/validations/incentive-rate";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";
import { CRM_MODULE_ENABLED } from "@/lib/constants/modules";

const BLOCKED_RATE_KEYS = new Set(["e", "E", "+", "-", "Subtract", "Add", ","]);

const STATUS_TONES: Record<string, Tone> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  ADDED_TO_PAYROLL: "info",
};

export default function IncentivesPage() {
  // MIYO-0151: an incentive is raised against a CRM client account, so with
  // the CRM module off there is nothing to raise one from and no way to
  // create one here. The nav already hides this; typing the URL now 404s too.
  if (!CRM_MODULE_ENABLED) notFound();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const statusFilter = searchParams.get("status") || "all";
  const page = Number(searchParams.get("page")) || 1;

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  const [showConfigSheet, setShowConfigSheet] = useState(false);
  const [newRate, setNewRate] = useState("");
  const [approveModal, setApproveModal] = useState<{ id: number; calculated: string } | null>(null);
  const [approveAmount, setApproveAmount] = useState("");
  const [approveNotes, setApproveNotes] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState<PageSizeOption>(10);

  const { data: stats } = useHrIncentiveStats();
  const { data, isLoading, isError, error, refetch } = useHrIncentives({
    status: statusFilter !== "all" ? statusFilter as "PENDING" | "APPROVED" | "REJECTED" | "ADDED_TO_PAYROLL" : undefined,
    page,
    limit: 25,
  });
  const { data: configs } = useHrIncentiveConfigs();
  const { data: rateHistory, isLoading: historyLoading, isFetching: historyFetching } = useHrIncentiveConfigHistory(
    { page: historyPage, limit: historyPageSize },
    { enabled: showHistory },
  );

  const approveMutation = useApproveIncentive();
  const rejectMutation = useRejectIncentive();
  const setConfigMutation = useSetIncentiveConfig();

  const incentivesList = data?.incentives ?? [];
  const currentConfig = configs?.[0];
  const rateError = useMemo(() => incentiveRateInputError(newRate), [newRate]);
  const canSetRate = useMemo(
    () => Boolean(newRate.trim()) && !rateError && normalizeIncentiveRateString(newRate) !== null,
    [newRate, rateError],
  );

  function handleStatusFilterChange(v: string) {
    updateParams({ status: v === "all" ? null : v, page: null });
  }

  function handleApproveOpen(id: number, calculated: string) {
    setApproveModal({ id, calculated });
    setApproveAmount(calculated);
    setApproveNotes("");
  }

  function handleApproveClose() {
    setApproveModal(null);
  }

  function handleApproveConfirm() {
    if (!approveModal) return;
    const rounded = Number(parseFloat(approveAmount).toFixed(2));
    if (!approveAmount || !Number.isFinite(rounded) || rounded <= 0) {
      toast.error("Enter a valid positive amount");
      return;
    }
    if (!/^\d+(\.\d{1,2})?$/.test(rounded.toString())) {
      toast.error("Amount must have at most 2 decimal places");
      return;
    }
    approveMutation.mutate(
      { id: approveModal.id, approvedAmount: rounded.toString(), notes: approveNotes || undefined },
      {
        onSuccess: () => {
          toast.success("Incentive approved");
          setApproveModal(null);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }

  function handleReject(id: number) {
    rejectMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Incentive rejected");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }

  function handleSetRate() {
    const normalized = normalizeIncentiveRateString(newRate);
    const error = incentiveRateInputError(newRate);
    if (!normalized || error) {
      toast.error(error ?? "Enter a valid incentive rate with up to 2 decimal places");
      return;
    }
    setConfigMutation.mutate(
      { incentiveRate: normalized },
      {
        onSuccess: () => {
          toast.success("Incentive rate updated");
          setShowConfigSheet(false);
          setNewRate("");
          setHistoryPage(1);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <PageWrapper
      title="Incentive management"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setHistoryPage(1); setShowHistory(true); }}>
            <History className="size-4" aria-hidden="true" /> Rate History
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowConfigSheet(true)}>
            <Settings className="size-4" aria-hidden="true" /> Configure Rate
          </Button>
        </div>
      }
      filters={
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="h-9 w-40" aria-label="Status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="ADDED_TO_PAYROLL">Added to Payroll</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <div className="space-y-6">

        <StatsStrip
          items={[
            { label: "This Month", value: formatINR(stats?.thisMonth), icon: IndianRupee, tone: "success" },
            { label: "Total Revenue", value: formatINR(stats?.totalRevenue), icon: TrendingUp },
            { label: "Avg / Conversion", value: formatINR(stats?.avgPerConversion), icon: Users },
            { label: "Pending", value: stats?.pending ?? 0, icon: Clock, tone: "warning" },
            { label: "Approved", value: stats?.approved ?? 0, icon: CheckCircle2, tone: "success" },
          ]}
        />

        {currentConfig && (
          <Card className="border-primary/40 bg-brand-soft">
            <CardContent className="flex items-center gap-3 p-4">
              <div>
                <p className="text-sm font-medium">Current Incentive Rate: <span className="text-brand-text font-bold">{currentConfig.incentiveRate}%</span></p>
                <p className="text-xs tabular-nums text-muted-foreground">Effective from {new Date(currentConfig.effectiveFrom).toLocaleDateString(DEFAULT_LOCALE)}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {isError ? (
          <QueryErrorState title="Couldn't load incentives" error={error} onRetry={() => refetch()} />
        ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <ScrollArea className="max-h-[60vh] w-full" type="auto">
            <div className="min-w-max">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sales Rep</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Investment</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Calculated</TableHead>
                  <TableHead className="text-right">Approved</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={8} className="h-12"><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                  ))
                ) : incentivesList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="p-4">
                      <EmptyState
                        compact
                        className="border-0 bg-transparent"
                        title="No incentives found"
                        action={statusFilter !== "all" ? { label: "Clear filters", onClick: () => handleStatusFilterChange("all") } : undefined}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  incentivesList.map((inc) => (
                    <TableRow key={inc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={inc.salesRep?.image || ""} alt="" />
                            <AvatarFallback className="bg-brand-soft text-3xs text-brand-soft-foreground">{inc.salesRep?.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{inc.salesRep?.name || ""}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{inc.clientAccount?.clientName || ""}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatINR(inc.investmentAmount)}</TableCell>
                      <TableCell className="text-right tabular-nums">{inc.incentiveRate}%</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatINR(inc.calculatedAmount)}</TableCell>
                      <TableCell className="text-right tabular-nums text-success-strong">{inc.approvedAmount ? formatINR(inc.approvedAmount) : ""}</TableCell>
                      <TableCell>
                        <StatusPill tone={STATUS_TONES[inc.status] ?? "neutral"} dot>
                          {inc.status}
                        </StatusPill>
                      </TableCell>
                      <TableCell>
                        {inc.status === "PENDING" && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-success-strong hover:bg-success-soft hover:text-success-strong"
                              onClick={() => handleApproveOpen(inc.id, inc.calculatedAmount)}
                            >
                              <CheckCircle2 className="size-4" aria-hidden="true" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-danger-strong hover:bg-danger-soft hover:text-danger-strong"
                              onClick={() => handleReject(inc.id)}
                            >
                              <XCircle className="size-4" aria-hidden="true" /> Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </ScrollArea>
          {(data?.totalPages ?? 0) > 1 && (
            <div className="border-t px-4">
              <DataTablePagination
                page={data?.page ?? page}
                totalPages={data?.totalPages ?? 1}
                total={data?.total ?? incentivesList.length}
                limit={25}
                onPageChange={(nextPage) => updateParams({ page: nextPage <= 1 ? null : String(nextPage) })}
              />
            </div>
          )}
        </Card>
        )}
      </div>

      <Dialog open={!!approveModal} onOpenChange={(open) => !open && handleApproveClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Incentive</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Calculated Amount</Label>
              <p className="text-lg font-bold">{formatINR(approveModal?.calculated)}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Approved Amount (adjust if needed)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={approveAmount}
                onChange={(e) => setApproveAmount(e.target.value)}
                onBlur={(e) => {
                  const v = parseFloat(e.target.value);
                  if (Number.isFinite(v)) setApproveAmount(v.toFixed(2));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={approveNotes} onChange={(e) => setApproveNotes(e.target.value)} placeholder="Optional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleApproveClose}>Cancel</Button>
            <Button
              onClick={handleApproveConfirm}
              className="bg-success-600 hover:bg-success-700"
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <HrSheet
        open={showConfigSheet}
        onOpenChange={(open) => {
          setShowConfigSheet(open);
          if (!open) setNewRate("");
        }}
        title="Configure incentive rate"
        description="Set the incentive rate applied to all new investments."
        onSubmit={handleSetRate}
        submitLabel="Set Rate"
        isPending={setConfigMutation.isPending}
        submitDisabled={!canSetRate}
        submitDisabledReason={rateError ?? (newRate.trim() ? "Enter a valid rate." : "Enter the new rate.")}
      >
        {currentConfig && (
          <div className="rounded-lg bg-surface-sunken p-3">
            <p className="text-xs text-muted-foreground">Current Rate</p>
            <p className="text-lg font-bold">{currentConfig.incentiveRate}%</p>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>New Incentive Rate (%)</Label>
          <Input
            type="text"
            inputMode="decimal"
            value={newRate}
            onChange={(e) => setNewRate(sanitizeIncentiveRateInput(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "." && !e.currentTarget.value.includes(".")) return;
              if (BLOCKED_RATE_KEYS.has(e.key) || e.key === "-" || e.key === "Minus") {
                e.preventDefault();
              }
            }}
            onPaste={(e) => {
              e.preventDefault();
              setNewRate(sanitizeIncentiveRateInput(e.clipboardData.getData("text")));
            }}
            placeholder="e.g., 2.50"
            aria-invalid={rateError ? true : undefined}
            aria-describedby={rateError ? "incentive-rate-error" : "incentive-rate-hint"}
          />
          {rateError ? (
            <p id="incentive-rate-error" className="text-xs text-destructive">{rateError}</p>
          ) : (
            <p id="incentive-rate-hint" className="text-xs text-muted-foreground">
              Positive rate only, up to 2 decimal places (max 100%). Applied to all new investments.
            </p>
          )}
        </div>
      </HrSheet>

      <HrSheet
        open={showHistory}
        onOpenChange={(open) => {
          setShowHistory(open);
          if (!open) {
            setHistoryPage(1);
          }
        }}
        title="Incentive rate history"
        description="Every change to the incentive rate, newest first."
        showSubmit={false}
        footer={
          rateHistory && rateHistory.total > 0 ? (
            <DataTablePagination
              page={rateHistory.page}
              totalPages={rateHistory.totalPages}
              total={rateHistory.total}
              limit={historyPageSize}
              onPageChange={setHistoryPage}
              onLimitChange={(limit) => {
                setHistoryPageSize(limit as PageSizeOption);
                setHistoryPage(1);
              }}
            />
          ) : null
        }
      >
        {historyLoading || historyFetching ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : !rateHistory?.history.length ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No rate changes recorded yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {rateHistory.history.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {entry.previousRate !== null ? (
                      <>
                        <span className="text-muted-foreground tabular-nums">{entry.previousRate}%</span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-brand-text font-bold tabular-nums">{entry.incentiveRate}%</span>
                      </>
                    ) : (
                      <>
                        <Badge variant="outline" className="text-2xs">Initial</Badge>
                        <span className="text-brand-text font-bold tabular-nums">{entry.incentiveRate}%</span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-2xs text-muted-foreground">
                    <span>
                      Effective {new Date(entry.effectiveFrom).toLocaleDateString(DEFAULT_LOCALE, {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                      {entry.createdAt ? (
                        <>
                          {" · "}
                          Updated {new Date(entry.createdAt).toLocaleString(DEFAULT_LOCALE, {
                            day: "numeric", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </>
                      ) : null}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {entry.createdBy ? (
                        <>
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={entry.createdBy.image || ""} />
                            <AvatarFallback className="text-3xs">{entry.createdBy.name?.charAt(0) ?? "—"}</AvatarFallback>
                          </Avatar>
                          <span>{entry.createdBy.name ?? "Unknown"}</span>
                        </>
                      ) : (
                        <span>System</span>
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </HrSheet>
    </PageWrapper>
  );
}
