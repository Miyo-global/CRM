"use client";

import { useState } from "react";
import { Mail, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatusPill } from "@/components/ui/status-pill";
import type { Tone } from "@/lib/design/tones";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { formatIST } from "@/lib/date-utils";
import { useEmailLog, type EmailDeliveryRow } from "@/lib/api/hooks/email-log";

const PAGE_SIZE = 25;

const STATUS: Record<EmailDeliveryRow["status"], { label: string; tone: Tone }> = {
  queued: { label: "Queued", tone: "neutral" },
  sent: { label: "Sent", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  bounced: { label: "Bounced", tone: "warning" },
};

export default function EmailLogPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "ADMIN"]}>
      <EmailLogContent />
    </DashboardGate>
  );
}

function EmailLogContent() {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim(), 300);

  const { data, isLoading, isFetching, isError, error, refetch } = useEmailLog({
    page,
    pageSize: PAGE_SIZE,
    status: status === "all" ? undefined : status,
    q: q || undefined,
  });

  const rows = data?.deliveries ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const hasFilters = status !== "all" || !!q;

  const filters = (
    <div className="flex flex-wrap gap-2 items-end">
      <div className="flex flex-col gap-1 min-w-48 flex-1">
        <p className="text-2xs font-medium text-muted-foreground">Recipient</p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by email address"
            aria-label="Search by recipient"
            maxLength={200}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1 min-w-36">
        <p className="text-2xs font-medium text-muted-foreground">Status</p>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="h-8 text-sm w-full" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS).map(([value, { label }]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {hasFilters && (
        <Button variant="ghost" size="sm" className="self-end" onClick={() => { setSearch(""); setStatus("all"); setPage(1); }}>
          Clear
        </Button>
      )}
    </div>
  );

  return (
    <PageWrapper
      title="Email log"
      noInternalScroll
      actions={
        <div className="flex items-center gap-2">
          <Mail className="size-4 text-muted-foreground" aria-hidden />
          <span className="text-sm text-muted-foreground font-medium tabular-nums" aria-live="polite">
            {isFetching && !isLoading ? "Updating…" : `${total.toLocaleString()} emails`}
          </span>
        </div>
      }
      filters={filters}
    >
      <Card className="h-full min-h-0 overflow-hidden">
        <CardContent className="p-0 flex flex-col h-full min-h-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
            </div>
          ) : isError ? (
            <div className="p-4"><QueryErrorState error={error} onRetry={() => void refetch()} /></div>
          ) : rows.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title={hasFilters ? "No emails match these filters" : "No emails sent yet"}
                description={hasFilters ? "Try a different recipient or status." : "Every email the workspace sends will be listed here."}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto">
              <Table className="min-w-175">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-44">Time (IST)</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead hideBelow="xl" className="w-48">Template</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {formatIST(row.createdAt, { year: undefined, second: "2-digit" })}
                      </TableCell>
                      <TableCell className="text-sm max-w-64 truncate" title={row.toAddress}>{row.toAddress}</TableCell>
                      <TableCell className="text-sm max-w-80">
                        <span className="block truncate" title={row.subject}>{row.subject}</span>
                        {row.error && (
                          <span className="block truncate text-xs text-destructive" title={row.error}>{row.error}</span>
                        )}
                      </TableCell>
                      <TableCell hideBelow="xl" className="text-xs font-mono text-muted-foreground">{row.templateKey ?? ""}</TableCell>
                      <TableCell>
                        <StatusPill tone={STATUS[row.status]?.tone ?? "neutral"}>{STATUS[row.status]?.label ?? row.status}</StatusPill>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {total > PAGE_SIZE && (
            <div className="shrink-0 border-t border-border p-3 flex items-center justify-end gap-1.5 text-sm">
              <Button variant="outline" size="icon-xs" onClick={() => setPage((p) => p - 1)} disabled={page <= 1} aria-label="Previous page">
                <ChevronLeft aria-hidden />
              </Button>
              <span className="font-medium tabular-nums px-1">{page} / {totalPages}</span>
              <Button variant="outline" size="icon-xs" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} aria-label="Next page">
                <ChevronRight aria-hidden />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
