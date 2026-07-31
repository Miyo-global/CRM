"use client";

import { useCallback, useState, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Search, Users, IndianRupee, FileCheck, ClipboardList,
  ChevronRight, LayoutGrid, List, MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  TableBody, TableCell, TableHead, TableHeader, TableRow,
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


const STATUSES = ["ACCOUNT_OPENING", "QUERIES", "PLAN_SELECTED", "INVESTED"] as const;
type ClientStatus = typeof STATUSES[number];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; textColor: string; icon: React.ElementType }> = {
  ACCOUNT_OPENING: { label: "Account Opening", color: "border-blue-500", bg: "bg-blue-500/10", textColor: "text-blue-500", icon: ClipboardList },
  QUERIES: { label: "Queries", color: "border-amber-500", bg: "bg-amber-500/10", textColor: "text-amber-500", icon: MessageSquare },
  PLAN_SELECTED: { label: "Plan Selected", color: "border-purple-500", bg: "bg-purple-500/10", textColor: "text-purple-500", icon: FileCheck },
  INVESTED: { label: "Invested", color: "border-emerald-500", bg: "bg-emerald-500/10", textColor: "text-emerald-500", icon: IndianRupee },
};

function formatINR(val: string | number | null | undefined): string {
  if (!val) return "";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num) || num === 0) return "";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
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

function KanbanCard({ account }: { account: ClientAccount }) {
  return (
    <Link href={`/crm/clients/${account.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-3 space-y-2">
          <div>
            <p className="text-sm font-semibold truncate">{account.clientName}</p>
            {account.clientEmail && (
              <p className="text-[10px] text-muted-foreground truncate">{account.clientEmail}</p>
            )}
          </div>

          {account.estimatedInvestment && parseFloat(account.estimatedInvestment) > 0 && (
            <p className="text-xs font-mono text-muted-foreground">
              Est: {formatINR(account.estimatedInvestment)}
            </p>
          )}

          {account.status === "INVESTED" && account.investmentAmount && (
            <p className="text-xs font-mono font-semibold text-emerald-500">
              {formatINR(account.investmentAmount)}
            </p>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            {account.salesRep ? (
              <div className="flex items-center gap-1">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={account.salesRep.image || ""} />
                  <AvatarFallback className="text-[7px]">{account.salesRep.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">{account.salesRep.name}</span>
              </div>
            ) : <span />}

            {account.assignedCrm ? (
              <div className="flex items-center gap-1">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={account.assignedCrm.image || ""} />
                  <AvatarFallback className="text-[7px]">{account.assignedCrm.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">{account.assignedCrm.name}</span>
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground">No CRM</span>
            )}
          </div>

          {account.convertedAt && (
            <p className="text-[10px] text-muted-foreground">
              {new Date(account.convertedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}


function KanbanColumn({
  status,
  accounts,
  count,
}: {
  status: ClientStatus;
  accounts: ClientAccount[];
  count: number;
}) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] flex-1">
      <div className={cn("flex items-center gap-2 px-3 py-2 rounded-t-lg border-t-2", config.color, config.bg)}>
        <Icon className={cn("h-4 w-4", config.textColor)} />
        <span className="text-sm font-semibold">{config.label}</span>
        <Badge variant="secondary" className="ml-auto text-[10px] h-5 min-w-5 px-1.5">
          {count}
        </Badge>
      </div>
      <div className="flex-1 space-y-2 p-2 bg-muted/30 rounded-b-lg border border-t-0 min-h-[200px] max-h-[calc(100vh-22rem)] overflow-y-auto">
        {accounts.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No clients</p>
        ) : (
          accounts.map((account) => (
            <KanbanCard key={account.id} account={account} />
          ))
        )}
      </div>
    </div>
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

  const { data, isLoading } = useClientAccounts(queryFilters);
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
      actions={
        <div className="flex items-center gap-2">
          <AssignCrmDialog />
          <div className="flex items-center gap-1 border rounded-md p-0.5">
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5 gap-1.5"
              onClick={() => handleViewMode("kanban")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Board</span>
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5 gap-1.5"
              onClick={() => handleViewMode("table")}
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Table</span>
            </Button>
          </div>
        </div>
      }
      filters={
        <>
          <div className="relative flex-1 max-w-sm min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {viewMode === "table" && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Stages</SelectItem>
                {STATUSES.map(s => (
                  <SelectItem key={s} value={s} className="text-xs">{STATUS_CONFIG[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </>
      }
    >
      <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="visible">

      <motion.div variants={fadeUp} className="grid gap-4 grid-cols-2 md:grid-cols-5">
        {[
          { label: "Total", value: stats?.total ?? 0, icon: Users, color: "text-foreground" },
          { label: "Account Opening", value: stats?.accountOpening ?? 0, icon: ClipboardList, color: "text-blue-400" },
          { label: "Queries", value: stats?.queries ?? 0, icon: MessageSquare, color: "text-amber-400" },
          { label: "Plan Selected", value: stats?.planSelected ?? 0, icon: FileCheck, color: "text-purple-400" },
          { label: "Invested", value: stats?.invested ?? 0, icon: IndianRupee, color: "text-emerald-400" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <s.icon className={cn("h-5 w-5", s.color)} />
                <span className={cn("text-2xl font-bold tabular-nums", s.color)}>
                  {statsLoading ? <Skeleton className="h-7 w-8" /> : s.value}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {viewMode === "kanban" && (
        <motion.div variants={fadeUp}>
          {isLoading ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {STATUSES.map((s) => (
                <div key={s} className="min-w-[280px] flex-1">
                  <Skeleton className="h-10 mb-2 rounded-t-lg" />
                  <div className="space-y-2 p-2">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {kanbanColumns.map(({ status, accounts: colAccounts, count }) => (
                <KanbanColumn
                  key={status}
                  status={status}
                  accounts={colAccounts}
                  count={count}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}

      {viewMode === "table" && (
        <motion.div variants={fadeUp}>
          <div className="border border-border rounded-md flex flex-col h-[calc(100dvh-18rem)] min-h-[320px]">
            <div className="flex-1 min-h-0 overflow-auto">
              <div className="min-w-max">
              <table className="w-full caption-bottom text-[11px]">
                <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                  <TableRow className="border-b-2 border-border">
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Client</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Phone</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Stage</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Sales Rep</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">CRM Rep</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Est. Inv.</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Investment</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Converted</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">AI</TableHead>
                    <TableHead className="text-[10px] w-8 px-2"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={10} className="h-12">
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-medium text-foreground">No client accounts</p>
                        <p className="text-xs mt-1">Convert leads to CONVERTED status to create client accounts.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    accounts.map((account) => {
                      const config = STATUS_CONFIG[account.status] || STATUS_CONFIG.ACCOUNT_OPENING;
                      return (
                        <TableRow key={account.id} className="h-8 hover:bg-muted/30 transition-colors">
                          <TableCell className="px-2 py-1">
                            <div>
                              <p className="text-[12px] font-medium truncate max-w-[140px]">{account.clientName}</p>
                              <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{account.clientEmail || ""}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-[11px] text-muted-foreground font-mono px-2 py-1">
                            {account.clientPhone || ""}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-[10px] border-0", config.bg, config.textColor)}>
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {account.salesRep ? (
                              <div className="flex items-center gap-1.5">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={account.salesRep.image || ""} />
                                  <AvatarFallback className="text-[8px]">{account.salesRep.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs truncate max-w-[80px]">{account.salesRep.name}</span>
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            {account.assignedCrm ? (
                              <div className="flex items-center gap-1.5">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={account.assignedCrm.image || ""} />
                                  <AvatarFallback className="text-[8px]">{account.assignedCrm.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs truncate max-w-[80px]">{account.assignedCrm.name}</span>
                              </div>
                            ) : <span className="text-xs text-muted-foreground">Unassigned</span>}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {formatINR(account.estimatedInvestment)}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-emerald-400">
                            {account.status === "INVESTED" ? formatINR(account.investmentAmount) : ""}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {account.convertedAt ? new Date(account.convertedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <AIChurnRiskButton clientId={account.id} compact />
                          </TableCell>
                          <TableCell>
                            <Link href={`/crm/clients/${account.id}`}>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </table>
              </div>
            </div>
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
        </motion.div>
      )}

      </motion.div>
    </PageWrapper>
  );
}
