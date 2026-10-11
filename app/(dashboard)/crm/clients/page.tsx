"use client";

import { useCallback, useState, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Users, IndianRupee, FileCheck, ClipboardList,
  ChevronRight, LayoutGrid, List, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsStrip, type StatsStripItem } from "@/components/shared/stats-strip";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { KanbanCanvas, KanbanColumnShell, KanbanEmptyDrop, kanbanCardClass } from "@/components/shared/kanban";
import { EmptySearchIllustration, EmptyTeamIllustration } from "@/components/illustrations";
import type { Tone } from "@/lib/design/tones";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { useClientAccounts } from "@/lib/api/hooks/crm";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { AIChurnRiskButton } from "@/features/crm/clients/ai-churn-risk-button";
import { AssignCrmDialog } from "@/features/crm/clients/assign-crm-dialog";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@/lib/constants/locale";


const STATUSES = ["ACCOUNT_OPENING", "QUERIES", "PLAN_SELECTED", "INVESTED"] as const;
type ClientStatus = typeof STATUSES[number];

const STATUS_CONFIG: Record<string, { label: string; tone: Tone; icon: React.ComponentType<{ className?: string }> }> = {
  ACCOUNT_OPENING: { label: "Account Opening", tone: "info", icon: ClipboardList },
  QUERIES: { label: "Queries", tone: "warning", icon: MessageSquare },
  PLAN_SELECTED: { label: "Plan Selected", tone: "plum", icon: FileCheck },
  INVESTED: { label: "Invested", tone: "success", icon: IndianRupee },
};

function formatINR(val: string | number | null | undefined): string {
  if (!val) return "";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num) || num === 0) return "";
  return new Intl.NumberFormat(DEFAULT_LOCALE, { style: "currency", currency: DEFAULT_CURRENCY, maximumFractionDigits: 0 }).format(num);
}


interface ClientAccount {
  id: number;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  status: string;
  estimatedInvestment: string | null;
  investmentAmount: string | null;
  convertedAt: string | null;
  salesRep: { name: string | null; image: string | null } | null;
  assignedCrm: { name: string | null; image: string | null } | null;
}

function RepChip({ rep }: { rep: { name: string | null; image: string | null } }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Avatar className="size-5">
        <AvatarImage src={rep.image || ""} />
        <AvatarFallback className="text-3xs">{rep.name?.charAt(0)}</AvatarFallback>
      </Avatar>
      <span className="max-w-24 truncate text-xs text-muted-foreground">{rep.name}</span>
    </div>
  );
}

function KanbanCard({ account }: { account: ClientAccount }) {
  return (
    <Link href={`/crm/clients/${account.id}`} className={cn(kanbanCardClass(), "space-y-2")}>
      <div>
        <p className="line-clamp-2 text-sm font-medium">{account.clientName}</p>
        {account.clientEmail && (
          <p className="truncate text-xs text-muted-foreground">{account.clientEmail}</p>
        )}
      </div>

      {account.estimatedInvestment && parseFloat(account.estimatedInvestment) > 0 && (
        <p className="text-xs tabular-nums text-muted-foreground">
          Est: {formatINR(account.estimatedInvestment)}
        </p>
      )}

      {account.status === "INVESTED" && account.investmentAmount && (
        <p className="text-xs font-semibold tabular-nums text-success-strong">
          {formatINR(account.investmentAmount)}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        {account.salesRep ? <RepChip rep={account.salesRep} /> : <span />}
        {account.assignedCrm ? (
          <RepChip rep={account.assignedCrm} />
        ) : (
          <span className="text-xs text-subtle-foreground">No CRM</span>
        )}
      </div>

      {account.convertedAt && (
        <p className="text-xs tabular-nums text-muted-foreground">
          {new Date(account.convertedAt).toLocaleDateString(DEFAULT_LOCALE, { day: "numeric", month: "short", year: "numeric" })}
        </p>
      )}
    </Link>
  );
}


export default function ClientAccountsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const search = searchParams.get("q") || "";
  const debouncedSearch = useDebouncedValue(search, 300);
  const statusFilter = searchParams.get("status") || "all";
  const page = Number(searchParams.get("page")) || 1;
  const [viewMode, setViewMode] = useState<"kanban" | "table">(
    searchParams.get("view") === "table" ? "table" : "kanban"
  );

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

  const setSearch = useCallback((q: string) => updateParams({ q: q || null, page: null }), [updateParams]);
  const setStatusFilter = useCallback((s: string) => updateParams({ status: s === "all" ? null : s, page: null }), [updateParams]);
  const setPage = useCallback((p: number) => updateParams({ page: p === 1 ? null : String(p) }), [updateParams]);
  const handleViewMode = useCallback((mode: "kanban" | "table") => {
    setViewMode(mode);
    updateParams({ view: mode === "kanban" ? null : mode });
  }, [updateParams]);

  const { data: allData, isLoading: statsLoading } = useClientAccounts({ limit: 500 });
  const allAccounts = (allData?.accounts ?? []) as ClientAccount[];
  const stats = {
    total: allAccounts.length,
    accountOpening: allAccounts.filter((a) => a.status === "ACCOUNT_OPENING").length,
    queries: allAccounts.filter((a) => a.status === "QUERIES").length,
    planSelected: allAccounts.filter((a) => a.status === "PLAN_SELECTED").length,
    invested: allAccounts.filter((a) => a.status === "INVESTED").length,
  };

  const queryFilters = viewMode === "kanban"
    ? { search: debouncedSearch || undefined, limit: 200 }
    : {
        status: statusFilter !== "all" ? statusFilter as ClientStatus : undefined,
        search: debouncedSearch || undefined,
        page,
        limit: 25,
      };

  const { data, isLoading, isError, error, refetch } = useClientAccounts(queryFilters);
  const accounts = (data?.accounts ?? []) as ClientAccount[];

  const kanbanAccounts = viewMode === "kanban" ? accounts : allAccounts;
  const kanbanColumns = STATUSES.map((status) => ({
    status,
    accounts: kanbanAccounts.filter((a) => a.status === status),
    count: stats[status === "ACCOUNT_OPENING" ? "accountOpening"
      : status === "QUERIES" ? "queries"
      : status === "PLAN_SELECTED" ? "planSelected"
      : "invested"],
  }));

  return (
    <PageWrapper
      title="Client Accounts"
      subtitle="Post-conversion client management — track account opening through investment"
      actions={<AssignCrmDialog />}
      filters={
        <ListToolbar
          className="w-full"
          search={{ value: search, onChange: setSearch, placeholder: "Search clients..." }}
          filters={
            viewMode === "table" && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-40 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Stages</SelectItem>
                  {STATUSES.map(s => (
                    <SelectItem key={s} value={s} className="text-xs">{STATUS_CONFIG[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          }
          view={
            <Tabs value={viewMode} onValueChange={(v) => handleViewMode(v as "kanban" | "table")}>
              <TabsList>
                <TabsTrigger value="kanban" className="gap-1.5">
                  <LayoutGrid className="size-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Board</span>
                </TabsTrigger>
                <TabsTrigger value="table" className="gap-1.5">
                  <List className="size-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Table</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          }
        />
      }
    >
      <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="visible">

      <motion.div variants={fadeUp}>
        <StatsStrip
          items={([
            { label: "Total", value: stats.total, icon: Users },
            { label: "Account Opening", value: stats.accountOpening, icon: ClipboardList, tone: "info" },
            { label: "Queries", value: stats.queries, icon: MessageSquare, tone: "warning" },
            { label: "Plan Selected", value: stats.planSelected, icon: FileCheck, tone: "plum" },
            { label: "Invested", value: stats.invested, icon: IndianRupee, tone: "success" },
          ] satisfies StatsStripItem[]).map((s) => ({ ...s, value: statsLoading ? <Skeleton className="h-7 w-8" /> : s.value }))}
        />
      </motion.div>

      {viewMode === "kanban" && (
        <motion.div variants={fadeUp}>
          {isError ? (
            <QueryErrorState title="Couldn't load client accounts" error={error} onRetry={() => refetch()} />
          ) : (
            <KanbanCanvas className="-mx-4 sm:-mx-6 xl:-mx-8">
              {kanbanColumns.map(({ status, accounts: colAccounts, count }) => {
                const config = STATUS_CONFIG[status];
                return (
                  <KanbanColumnShell key={status} title={config.label} tone={config.tone} count={count}>
                    {isLoading ? (
                      <>
                        <Skeleton className="h-24 rounded-md" />
                        <Skeleton className="h-24 rounded-md" />
                      </>
                    ) : colAccounts.length === 0 ? (
                      <KanbanEmptyDrop label="No clients" />
                    ) : (
                      colAccounts.map((account) => <KanbanCard key={account.id} account={account} />)
                    )}
                  </KanbanColumnShell>
                );
              })}
            </KanbanCanvas>
          )}
        </motion.div>
      )}

      {viewMode === "table" && (
        <motion.div variants={fadeUp}>
          {isError ? (
            <QueryErrorState title="Couldn't load client accounts" error={error} onRetry={() => refetch()} />
          ) : (
          <div className="space-y-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Sales Rep</TableHead>
                    <TableHead>CRM Rep</TableHead>
                    <TableHead className="text-right">Est. Inv.</TableHead>
                    <TableHead className="text-right">Investment</TableHead>
                    <TableHead>Converted</TableHead>
                    <TableHead>AI</TableHead>
                    <TableHead className="w-10"><span className="sr-only">Open</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={10}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : accounts.length === 0 ? (
                    <TableEmpty colSpan={10}>
                      {search || statusFilter !== "all" ? (
                        <EmptyState
                          compact
                          illustration={<EmptySearchIllustration className="size-24" />}
                          title="No results for these filters"
                          action={{ label: "Clear filters", onClick: () => updateParams({ q: null, status: null, page: null }) }}
                        />
                      ) : (
                        <EmptyState
                          compact
                          illustration={<EmptyTeamIllustration className="size-24" />}
                          title="No client accounts"
                          description="Convert leads to CONVERTED status to create client accounts."
                        />
                      )}
                    </TableEmpty>
                  ) : (
                    accounts.map((account) => {
                      const config = STATUS_CONFIG[account.status] || STATUS_CONFIG.ACCOUNT_OPENING;
                      return (
                        <TableRow key={account.id}>
                          <TableCell>
                            <p className="max-w-40 truncate font-medium" title={account.clientName}>{account.clientName}</p>
                            <p className="max-w-40 truncate text-xs text-muted-foreground">{account.clientEmail || ""}</p>
                          </TableCell>
                          <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                            {account.clientPhone || ""}
                          </TableCell>
                          <TableCell>
                            <StatusPill tone={config.tone} dot>{config.label}</StatusPill>
                          </TableCell>
                          <TableCell>
                            {account.salesRep ? <RepChip rep={account.salesRep} /> : null}
                          </TableCell>
                          <TableCell>
                            {account.assignedCrm ? <RepChip rep={account.assignedCrm} /> : <span className="text-xs text-subtle-foreground">Unassigned</span>}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatINR(account.estimatedInvestment)}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums text-success-strong">
                            {account.status === "INVESTED" ? formatINR(account.investmentAmount) : ""}
                          </TableCell>
                          <TableCell
                            className="text-xs tabular-nums text-muted-foreground"
                            title={account.convertedAt ? new Date(account.convertedAt).toLocaleString(DEFAULT_LOCALE) : undefined}
                          >
                            {account.convertedAt ? new Date(account.convertedAt).toLocaleDateString(DEFAULT_LOCALE, { day: "numeric", month: "short" }) : ""}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <AIChurnRiskButton clientId={account.id} compact />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon-sm" asChild>
                              <Link href={`/crm/clients/${account.id}`} aria-label={`Open ${account.clientName}`}>
                                <ChevronRight className="size-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            {(data?.totalCount ?? 0) > 0 && (
              <DataTablePagination
                page={data?.page ?? page}
                totalPages={data?.totalPages ?? 1}
                total={data?.totalCount ?? 0}
                limit={20}
                onPageChange={setPage}
              />
            )}
          </div>
          )}
        </motion.div>
      )}

      </motion.div>
    </PageWrapper>
  );
}
