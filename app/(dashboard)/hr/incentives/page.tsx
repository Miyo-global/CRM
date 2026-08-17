"use client";
import { getErrorMessage } from "@/lib/get-error-message";

import { useState, useTransition, useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  IndianRupee, CheckCircle2, XCircle, Clock, Settings,
  TrendingUp, Users, Percent, History, ArrowRight,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { formatINRWhole as formatINR } from "@/lib/format-utils";
import {
  incentiveRateInputError,
  normalizeIncentiveRateString,
  sanitizeIncentiveRateInput,
} from "@/lib/validations/incentive-rate";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

const BLOCKED_RATE_KEYS = new Set(["e", "E", "+", "-", "Subtract", "Add", ","]);

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-400",
  APPROVED: "bg-emerald-500/10 text-emerald-400",
  REJECTED: "bg-red-500/10 text-red-400",
  ADDED_TO_PAYROLL: "bg-blue-500/10 text-blue-400",
};

export default function IncentivesPage() {
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
  const { data, isLoading } = useHrIncentives({
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
      title="Incentive Management"
      subtitle="Manage sales incentives, approvals, and rate configuration"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setHistoryPage(1); setShowHistory(true); }}>
            <History className="h-4 w-4 mr-1" /> Rate History
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowConfigSheet(true)}>
            <Settings className="h-4 w-4 mr-1" /> Configure Rate
          </Button>
        </div>
      }
      filters={
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Status</SelectItem>
            <SelectItem value="PENDING" className="text-xs">Pending</SelectItem>
            <SelectItem value="APPROVED" className="text-xs">Approved</SelectItem>
            <SelectItem value="REJECTED" className="text-xs">Rejected</SelectItem>
            <SelectItem value="ADDED_TO_PAYROLL" className="text-xs">Added to Payroll</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <div className="space-y-6">

        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          {[
            { label: "This Month", value: formatINR(stats?.thisMonth), icon: IndianRupee, color: "text-emerald-400" },
            { label: "Total Revenue", value: formatINR(stats?.totalRevenue), icon: TrendingUp, color: "text-blue-400" },
            { label: "Avg / Conversion", value: formatINR(stats?.avgPerConversion), icon: Users, color: "text-purple-400" },
            { label: "Pending", value: stats?.pending ?? 0, icon: Clock, color: "text-amber-400" },
            { label: "Approved", value: stats?.approved ?? 0, icon: CheckCircle2, color: "text-emerald-400" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <s.icon className={cn("h-5 w-5", s.color)} />
                  <span className={cn("text-xl font-bold tabular-nums", s.color)}>{s.value}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {currentConfig && (
          <Card className="bg-gold/5 border-gold/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Percent className="h-5 w-5 text-gold" />
              <div>
                <p className="text-sm font-medium">Current Incentive Rate: <span className="text-gold font-bold">{currentConfig.incentiveRate}%</span></p>
                <p className="text-xs text-muted-foreground">Effective from {new Date(currentConfig.effectiveFrom).toLocaleDateString(DEFAULT_LOCALE)}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <ScrollArea className="w-full max-h-[60vh]" type="auto">
            <div className="min-w-max">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Sales Rep</TableHead>
                  <TableHead className="text-xs">Client</TableHead>
                  <TableHead className="text-xs">Investment</TableHead>
                  <TableHead className="text-xs">Rate</TableHead>
                  <TableHead className="text-xs">Calculated</TableHead>
                  <TableHead className="text-xs">Approved</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={8} className="h-12"><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                  ))
                ) : incentivesList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      No incentives found
                    </TableCell>
                  </TableRow>
                ) : (
                  incentivesList.map((inc) => (
                    <TableRow key={inc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={inc.salesRep?.image || ""} />
                            <AvatarFallback className="text-[9px]">{inc.salesRep?.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{inc.salesRep?.name || ""}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{inc.clientAccount?.clientName || ""}</TableCell>
                      <TableCell className="text-xs font-mono">{formatINR(inc.investmentAmount)}</TableCell>
                      <TableCell className="text-xs">{inc.incentiveRate}%</TableCell>
                      <TableCell className="text-xs font-mono font-medium">{formatINR(inc.calculatedAmount)}</TableCell>
                      <TableCell className="text-xs font-mono text-emerald-400">{inc.approvedAmount ? formatINR(inc.approvedAmount) : ""}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px] border-0", STATUS_COLORS[inc.status])}>
                          {inc.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {inc.status === "PENDING" && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-emerald-400 hover:text-emerald-300"
                              onClick={() => handleApproveOpen(inc.id, inc.calculatedAmount)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-red-400 hover:text-red-300"
                              onClick={() => handleReject(inc.id)}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
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
              className="bg-emerald-600 hover:bg-emerald-700"
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
        title="Configure Incentive Rate"
        description="Set the incentive rate applied to all new investments."
        onSubmit={handleSetRate}
        submitLabel="Set Rate"
        isPending={setConfigMutation.isPending}
        submitDisabled={!canSetRate}
      >
        {currentConfig && (
          <div className="p-3 bg-muted/50 rounded-lg">
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
        title="Incentive Rate History"
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
                        <span className="text-gold font-bold tabular-nums">{entry.incentiveRate}%</span>
                      </>
                    ) : (
                      <>
                        <Badge variant="outline" className="text-[10px]">Initial</Badge>
                        <span className="text-gold font-bold tabular-nums">{entry.incentiveRate}%</span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
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
                            <AvatarFallback className="text-[8px]">{entry.createdBy.name?.charAt(0) ?? "?"}</AvatarFallback>
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
