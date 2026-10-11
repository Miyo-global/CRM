"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptySearchIllustration } from "@/components/illustrations";
import { formatDealId, formatINRCompact } from "@/lib/format-utils";
import { formatDisplayDate, timeAgo } from "@/lib/date-utils";
import { AIPredictDealButton } from "./ai-predict-deal-button";

interface Deal {
  id: number;
  name: string;
  value?: string | null;
  stage: string;
  probability?: number | null;
  contactPerson?: string | null;
  contactEmail?: string | null;
  expectedCloseDate?: string | null;
  createdAt?: string | Date | null;
  assignedTo?: { id?: string; name?: string | null; image?: string | null } | null;
}

interface DealTableViewProps {
  deals: Deal[];
  sortColumn: string;
  sortDirection: "asc" | "desc";
  onSort: (column: string) => void;
  onStageChange: (dealId: number, newStage: string) => void;
  isLoading: boolean;
}

const STAGES = ["LEAD", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

const STAGE_COLORS: Record<string, string> = {
  LEAD: "bg-info-soft text-info-strong border-info-strong/20",
  CONTACTED: "bg-info-soft text-info-strong border-info-strong/20",
  PROPOSAL: "bg-warning-soft text-warning-strong border-warning-strong/20",
  NEGOTIATION: "bg-plum-soft text-plum-strong border-plum-strong/20",
  WON: "bg-success-soft text-success-strong border-success-strong/20",
  LOST: "bg-danger-soft text-danger-strong border-danger-strong/20",
};

function formatINR(val: string | number | null | undefined): string {
  return val == null || Number(val) === 0 ? "" : formatINRCompact(val);
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  return formatDisplayDate(date, { day: "numeric", month: "short", year: "numeric" }) || "";
}

export function DealTableView({
  deals, sortColumn, sortDirection, onSort, onStageChange, isLoading,
}: DealTableViewProps) {
  const router = useRouter();
  const [editingCell, setEditingCell] = useState<{ dealId: number; column: string } | null>(null);

  const columns = [
    { key: "dealId", label: "Deal ID", sortable: false },
    { key: "name", label: "Deal Name", sortable: true },
    { key: "value", label: "Value", sortable: true },
    { key: "stage", label: "Stage", sortable: true },
    { key: "probability", label: "Prob%", sortable: true },
    { key: "ai", label: "AI", sortable: false },
    { key: "contactPerson", label: "Contact", sortable: false },
    { key: "assignedTo", label: "Assigned", sortable: false },
    { key: "expectedCloseDate", label: "Close", sortable: false },
    { key: "createdAt", label: "Created", sortable: true },
  ];

  function SortIcon({ column }: { column: string }) {
    if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortDirection === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1 text-brand-text" />
      : <ArrowDown className="h-3 w-3 ml-1 text-brand-text" />;
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-18rem)] min-h-[320px]">
      <div className="shrink-0 flex items-center px-1 pb-1.5">
        <span className="text-xs text-muted-foreground tabular-nums">{deals.length} deals</span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card">
        <div className="min-w-max">
          <table className="w-full caption-bottom text-xs">
            <TableHeader className="sticky top-0 z-sticky bg-surface-sunken">
              <TableRow className="border-b border-border hover:bg-transparent">
                {columns.map(col => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      "whitespace-nowrap px-3 py-2 text-2xs font-semibold uppercase tracking-wider text-muted-foreground",
                      col.sortable && "cursor-pointer select-none hover:text-foreground",
                    )}
                    onClick={() => col.sortable && onSort(col.key)}
                  >
                    <span className="flex items-center">
                      {col.label}
                      {col.sortable && <SortIcon column={col.key} />}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={columns.length} className="h-10 px-3">
                      <Skeleton className="h-3 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : deals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="p-4 hover:bg-transparent">
                    <EmptyState compact illustration={<EmptySearchIllustration />} title="No deals found" className="border-0 bg-transparent" />
                  </TableCell>
                </TableRow>
              ) : (
                deals.map((deal) => {
                  const isEditingStage = editingCell?.dealId === deal.id && editingCell?.column === "stage";
                  return (
                    <TableRow
                      key={deal.id}
                      className="h-10 transition-colors hover:bg-accent/60"
                    >
                      <TableCell className="px-3 py-1.5">
                        <span className="font-mono text-2xs text-muted-foreground select-all">
                          {formatDealId(deal.id)}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-1.5">
                        <button
                          className="font-medium text-xs hover:text-brand-text hover:underline text-left truncate max-w-[160px] block"
                          onClick={() => router.push(`/crm/deals/${deal.id}`)}
                        >
                          {deal.name}
                        </button>
                      </TableCell>
                      <TableCell className="px-3 py-1.5 font-mono tabular-nums text-brand-text font-medium">
                        {formatINR(deal.value)}
                      </TableCell>
                      <TableCell className="px-3 py-1.5">
                        {isEditingStage ? (
                          <Select defaultValue={deal.stage} onValueChange={(v) => { onStageChange(deal.id, v); setEditingCell(null); }}>
                            <SelectTrigger className="h-6 text-2xs w-[100px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STAGES.map(s => <SelectItem key={s} value={s} className="text-2xs">{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            variant="outline"
                            className={cn("text-3xs px-1.5 py-0 h-5 cursor-pointer border font-medium", STAGE_COLORS[deal.stage])}
                            onClick={() => setEditingCell({ dealId: deal.id, column: "stage" })}
                          >
                            {deal.stage}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-1.5 tabular-nums">
                        {deal.probability != null ? `${deal.probability}%` : ""}
                      </TableCell>
                      <TableCell className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                        <AIPredictDealButton dealId={deal.id} compact />
                      </TableCell>
                      <TableCell className="px-3 py-1.5 truncate max-w-[100px]">
                        {deal.contactPerson || ""}
                      </TableCell>
                      <TableCell className="px-3 py-1.5">
                        {deal.assignedTo?.name ? (
                          <div className="flex items-center gap-1">
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={deal.assignedTo.image || ""} />
                              <AvatarFallback className="text-3xs">{deal.assignedTo.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="truncate max-w-[70px]">{deal.assignedTo.name}</span>
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="px-3 py-1.5 text-muted-foreground tabular-nums">
                        {deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : ""}
                      </TableCell>
                      <TableCell className="px-3 py-1.5 text-muted-foreground tabular-nums">
                        {timeAgo(deal.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </table>
        </div>
      </div>
    </div>
  );
}
