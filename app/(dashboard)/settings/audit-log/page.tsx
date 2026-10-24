"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatusPill } from "@/components/ui/status-pill";
import type { Tone } from "@/lib/design/tones";
import { EmptyState } from "@/components/ui/empty-state";
import { Shield, Search, ChevronLeft, ChevronRight, Info, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import {
  useAuditLogs,
  useAuditLogActions,
  useAuditLogTargetTypes,
  type AuditLogRow,
} from "@/lib/api/hooks/audit-log";
import { resolveImageUrl } from "@/lib/utils";
import { getInitials } from "@/lib/format-utils";
import { formatIST } from "@/lib/date-utils";
import { auditActionLabel } from "@/lib/audit-action-label";
import { auditTargetTypeLabel } from "@/lib/labels";
import {
  PAGE_SIZE_OPTIONS,
  parsePaginationFromSearchParams,
  buildPaginationQueryUpdates,
  DEFAULT_PAGE_SIZE,
} from "@/lib/pagination-constants";

const ACTION_TONES: Record<string, Tone> = {
  "user.login": "success",
  "user.logout": "neutral",
  "user.password_reset": "warning",
  "user.deactivated": "danger",
  "org.member_invited": "info",
  "org.member_removed": "danger",
  "org.member_role_changed": "plum",
  "expense.approved": "success",
  "expense.rejected": "danger",
  "hr.leave_approved": "success",
  "hr.leave_rejected": "danger",
  "hr.payroll_generated": "info",
  "hr.payroll_deleted": "danger",
  "settings.updated": "warning",
  "file.upload": "info",
};

function actionTone(action: string): Tone {
  for (const [key, tone] of Object.entries(ACTION_TONES)) {
    if (action.startsWith(key)) return tone;
  }
  return "neutral";
}

interface LogTableRowProps {
  log: AuditLogRow;
  onSelect: (log: AuditLogRow) => void;
}

function LogTableRow({ log, onSelect }: LogTableRowProps) {
  const handleClick = useCallback(() => onSelect(log), [log, onSelect]);
  return (
    <TableRow
      className="cursor-pointer focus-visible:bg-accent focus-visible:outline-none"
      onClick={handleClick}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") handleClick(); }}
    >
      <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap" title={`${formatIST(log.createdAt, { second: "2-digit" })} IST`}>
        {formatIST(log.createdAt, { year: undefined, second: "2-digit" })}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 min-w-36">
          <Avatar className="size-6 shrink-0">
            <AvatarImage src={resolveImageUrl(log.userImage)} />
            <AvatarFallback className="text-3xs">{getInitials(log.userName)}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium truncate max-w-32" title={log.userName ?? log.userEmail ?? log.userId}>
            {log.userName ?? log.userEmail ?? log.userId}
          </span>
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <StatusPill tone={actionTone(log.action)}>
          {auditActionLabel(log.action)}
        </StatusPill>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
        {log.targetType ? auditTargetTypeLabel(log.targetType) : ""}
        {log.targetId && (
          <span className="text-2xs text-subtle-foreground tabular-nums"> #{log.targetId}</span>
        )}
      </TableCell>
      <TableCell hideBelow="xl" className="text-xs font-mono text-muted-foreground whitespace-nowrap">
        {log.ipAddress ?? ""}
      </TableCell>
      <TableCell pinned="right">
        <Button variant="ghost" size="icon-xs" className="text-muted-foreground" aria-label="View details" tabIndex={-1}>
          <Info aria-hidden />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      {children}
    </div>
  );
}

function LogDetailSheet({ log, onClose }: { log: AuditLogRow; onClose: () => void }) {
  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent size="sm" className="flex flex-col gap-0 p-0 w-full">
        <SheetHeader className="border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2">
            Event Details
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 min-h-0 px-4 py-3 space-y-4 overflow-hidden">
          <DetailField label="Action">
            <StatusPill tone={actionTone(log.action)}>
              {auditActionLabel(log.action)}
            </StatusPill>
            <p className="mt-1 font-mono text-2xs text-muted-foreground">{log.action}</p>
          </DetailField>
          <DetailField label="User">
            <div className="flex items-center gap-2.5">
              <Avatar className="size-7">
                <AvatarImage src={resolveImageUrl(log.userImage)} />
                <AvatarFallback className="text-2xs">{getInitials(log.userName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight truncate">{log.userName ?? "Unknown"}</p>
                <p className="text-xs text-muted-foreground truncate">{log.userEmail}</p>
              </div>
            </div>
          </DetailField>
          {log.targetType && (
            <DetailField label="Target">
              <p className="text-sm">
                <span className="font-medium">{auditTargetTypeLabel(log.targetType)}</span>
                {log.targetId && <span className="text-muted-foreground"> #{log.targetId}</span>}
              </p>
            </DetailField>
          )}
          <DetailField label="Timestamp">
            <p className="text-sm tabular-nums">{formatIST(log.createdAt, { second: "2-digit" })} IST</p>
          </DetailField>
          {log.ipAddress && (
            <DetailField label="IP Address">
              <p className="text-sm font-mono">{log.ipAddress}</p>
            </DetailField>
          )}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <DetailField label="Metadata">
              <pre className="font-mono text-2xs bg-surface-sunken rounded-md p-3 border border-border text-foreground overflow-y-auto overflow-x-hidden whitespace-pre-wrap wrap-break-word max-h-none h-[calc(100vh-360px)] min-h-30">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </DetailField>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function AuditLogPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR"]}>
      <AuditLogContent />
    </DashboardGate>
  );
}

function AuditLogContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [goToPage, setGoToPage] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);

  const { page, pageSize } = parsePaginationFromSearchParams(searchParams);
  const actionFilter = searchParams.get("action") || "all";
  const targetTypeFilter = searchParams.get("target") || "all";
  const dateFrom = searchParams.get("from") || "";
  const dateTo = searchParams.get("to") || "";
  const query = searchParams.get("q") || "";

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      // R3-ADM-09: a shallow history update re-renders with the new filter at
      // once; router.replace waited on a server round trip first.
      const qs = params.toString();
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname],
  );

  const [searchInput, setSearchInput] = useState(query);
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);
  useEffect(() => {
    const current = new URLSearchParams(window.location.search).get("q") || "";
    if (debouncedSearch !== current) updateParams({ q: debouncedSearch || null, page: null });
  }, [debouncedSearch, updateParams]);

  const { data, isLoading, isFetching, isError, error, refetch } = useAuditLogs({
    page,
    pageSize,
    action: actionFilter !== "all" ? actionFilter : undefined,
    targetType: targetTypeFilter !== "all" ? targetTypeFilter : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    q: query || undefined,
  });

  const { data: actions } = useAuditLogActions();
  const { data: targetTypes } = useAuditLogTargetTypes();

  const logs = data?.logs ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const resetFilters = useCallback(() => {
    setSearchInput("");
    updateParams({ action: null, target: null, from: null, to: null, q: null, page: null });
  }, [updateParams]);

  const handleActionFilter = useCallback((v: string) => updateParams({ action: v === "all" ? null : v, page: null }), [updateParams]);
  const handleTargetTypeFilter = useCallback((v: string) => updateParams({ target: v === "all" ? null : v, page: null }), [updateParams]);
  const handleDateFrom = useCallback((v: string) => updateParams({ from: v || null, page: null }), [updateParams]);
  const handleDateTo = useCallback((v: string) => updateParams({ to: v || null, page: null }), [updateParams]);
  const handlePrevPage = useCallback(() => updateParams({ page: page <= 2 ? null : String(page - 1) }), [updateParams, page]);
  const handleNextPage = useCallback(() => updateParams({ page: String(Math.min(totalPages, page + 1)) }), [updateParams, totalPages, page]);
  const handleFirstPage = useCallback(() => updateParams({ page: null }), [updateParams]);
  const handleLastPage = useCallback(() => updateParams({ page: String(totalPages) }), [updateParams, totalPages]);
  const handleCloseSheet = useCallback(() => setSelectedLog(null), []);

  const handlePageSizeChange = useCallback(
    (v: string) => {
      const size = Number(v);
      updateParams(
        buildPaginationQueryUpdates({
          page: 1,
          pageSize: Number.isFinite(size) ? (size as typeof DEFAULT_PAGE_SIZE) : DEFAULT_PAGE_SIZE,
        }),
      );
    },
    [updateParams],
  );

  const handleGoToPageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setGoToPage(e.target.value);
  }, []);

  const handleGoToPageKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const num = parseInt(goToPage);
      if (!isNaN(num) && num >= 1 && num <= totalPages) {
        updateParams({ page: num === 1 ? null : String(num) });
        setGoToPage("");
      }
    }
  }, [goToPage, totalPages, updateParams]);

  const hasActiveFilters = actionFilter !== "all" || targetTypeFilter !== "all" || !!dateFrom || !!dateTo || !!query;

  const filtersBar = (
    <div className="flex flex-wrap gap-2 items-end">
      <div className="flex flex-col gap-1 min-w-48 flex-1">
        <p className="text-2xs font-medium text-muted-foreground">Search</p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="User, action, entity or ID"
            aria-label="Search audit log"
            maxLength={200}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1 min-w-40 flex-1">
        <p className="text-2xs font-medium text-muted-foreground">Action</p>
        <Select value={actionFilter} onValueChange={handleActionFilter}>
          <SelectTrigger className="h-8 text-sm w-full">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actions?.map((a) => (
              <SelectItem key={a} value={a}>{auditActionLabel(a)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1 min-w-32 flex-1">
        <p className="text-2xs font-medium text-muted-foreground">Entity Type</p>
        <Select value={targetTypeFilter} onValueChange={handleTargetTypeFilter}>
          <SelectTrigger className="h-8 text-sm w-full">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {targetTypes?.map((t) => (
              <SelectItem key={t} value={t}>{auditTargetTypeLabel(t)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1 min-w-36 flex-1">
        <p className="text-2xs font-medium text-muted-foreground">From</p>
        <DatePicker value={dateFrom} onChange={handleDateFrom} placeholder="From date" className="w-full" />
      </div>
      <div className="flex flex-col gap-1 min-w-36 flex-1">
        <p className="text-2xs font-medium text-muted-foreground">To</p>
        <DatePicker value={dateTo} onChange={handleDateTo} placeholder="To date" className="w-full" />
      </div>
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={resetFilters} className="self-end">
          Clear
        </Button>
      )}
    </div>
  );

  return (
    <PageWrapper
      title="Audit log"
      noInternalScroll
      actions={
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-muted-foreground" aria-hidden />
          <span className="text-sm text-muted-foreground font-medium tabular-nums" aria-live="polite">
            {isFetching && !isLoading ? "Updating…" : `${total.toLocaleString()} events`}
          </span>
        </div>
      }
      filters={filtersBar}
    >
      <div className="flex flex-col gap-4 h-full min-h-0">
        <Card className="flex-1 min-h-0 overflow-hidden">
          <CardContent className="p-0 flex flex-col h-full min-h-0">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: pageSize }).map((_, i) => (
                  <Skeleton key={i} className="h-11 w-full" />
                ))}
              </div>
            ) : isError ? (
              <div className="p-4">
                <QueryErrorState error={error} onRetry={() => void refetch()} />
              </div>
            ) : logs.length === 0 ? (
              <div className="p-4">
                {hasActiveFilters ? (
                  <EmptyState
                    title="No results for these filters"
                    description="Try a different search, action, entity type or date range."
                    action={{ label: "Clear filters", onClick: resetFilters }}
                  />
                ) : (
                  <EmptyState
                    title="No audit events found"
                    description="Activity across your workspace will appear here as it happens."
                  />
                )}
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto">
                {/* Under 768px: one stacked row per event — time, actor, action, target (QA-RESP-01). */}
                <ul className="divide-y divide-border md:hidden">
                  {logs.map((log) => (
                    <li key={log.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-accent/60 focus-visible:bg-accent focus-visible:outline-none"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">{log.userName ?? log.userEmail ?? log.userId}</span>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {formatIST(log.createdAt, { year: undefined })} IST
                          </span>
                        </span>
                        <span className="flex flex-wrap items-center gap-2">
                          <StatusPill tone={actionTone(log.action)} className="max-w-full truncate">
                            {auditActionLabel(log.action)}
                          </StatusPill>
                          {log.targetType && (
                            <span className="text-xs text-muted-foreground">
                              {auditTargetTypeLabel(log.targetType)}
                              {log.targetId && <span className="tabular-nums"> #{log.targetId}</span>}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="hidden md:block">
                <Table className="min-w-175">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-44">Timestamp (IST)</TableHead>
                      <TableHead className="w-48">User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead className="w-28">Entity</TableHead>
                      <TableHead hideBelow="xl" className="w-28">IP Address</TableHead>
                      <TableHead pinned="right" className="w-12"><span className="sr-only">Details</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <LogTableRow key={log.id} log={log} onSelect={setSelectedLog} />
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            )}

            {total > 0 && (
              <div className="shrink-0 border-t border-border bg-card">
                <div className="p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs">Rows per page</span>
                    <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                      <SelectTrigger className="h-7 w-16 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map((s) => (
                          <SelectItem key={s} value={String(s)} className="text-xs">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-xs tabular-nums">
                      {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total.toLocaleString()}
                    </span>
                  </div>

                  <div className="-mx-3 px-3 overflow-x-auto">
                    <div className="flex items-center gap-1.5 min-w-max">
                      <Button
                        variant="outline"
                        size="icon-xs"
                        onClick={handleFirstPage}
                        disabled={page <= 1}
                        aria-label="First page"
                      >
                        <ChevronsLeft aria-hidden />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon-xs"
                        onClick={handlePrevPage}
                        disabled={page <= 1}
                        aria-label="Previous page"
                      >
                        <ChevronLeft aria-hidden />
                      </Button>
                      <span className="text-sm font-medium tabular-nums px-1">{page} / {totalPages}</span>
                      <Button
                        variant="outline"
                        size="icon-xs"
                        onClick={handleNextPage}
                        disabled={page >= totalPages}
                        aria-label="Next page"
                      >
                        <ChevronRight aria-hidden />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon-xs"
                        onClick={handleLastPage}
                        disabled={page >= totalPages}
                        aria-label="Last page"
                      >
                        <ChevronsRight aria-hidden />
                      </Button>
                      <div className="flex items-center gap-1.5 ml-1">
                        <span className="text-xs">Go to</span>
                        <Input
                          type="number"
                          min={1}
                          max={totalPages}
                          value={goToPage}
                          onChange={handleGoToPageChange}
                          onKeyDown={handleGoToPageKeyDown}
                          placeholder=""
                          className="h-7 w-14 text-xs text-center"
                          aria-label="Go to page"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedLog && <LogDetailSheet log={selectedLog} onClose={handleCloseSheet} />}
    </PageWrapper>
  );
}
