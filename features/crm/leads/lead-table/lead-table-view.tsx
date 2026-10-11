"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Columns3, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptySearchIllustration } from "@/components/illustrations";
import {
  LeadTableViewProps, ALL_COLUMNS, PAGE_SIZES, getStoredColumns,
} from "./types";
import { SortIcon, useLeadCellRenderer } from "./lead-columns";
import { BulkActionsBar, ConversionModal, LostModal } from "./lead-actions";

export function LeadTableView({
  leads, totalCount, page, totalPages, pageSize,
  sortColumn, sortDirection, onSort, onPageChange, onPageSizeChange,
  onStatusChange, onPriorityChange, onAssign,
  onBulkUpdate, onBulkDelete, teamMembers,
  isLoading, isAdmin,
}: LeadTableViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editingCell, setEditingCell] = useState<{ leadId: number; column: string } | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(getStoredColumns);

  const [conversionModal, setConversionModal] = useState<{ leadId: number; leadName: string } | null>(null);
  const [lostModal, setLostModal] = useState<{ leadId: number; leadName: string } | null>(null);

  const allSelected = leads.length > 0 && leads.every((l) => selectedIds.has(l.id));

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds(allSelected ? new Set() : new Set(leads.map((l) => l.id)));
  }, [leads, allSelected]);

  const selectedArray = useMemo(() => [...selectedIds], [selectedIds]);

  const toggleColumn = useCallback((key: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  useEffect(() => {
    localStorage.setItem("lead-table-columns", JSON.stringify([...visibleColumns]));
  }, [visibleColumns]);

  const cols = useMemo(
    () => ALL_COLUMNS.filter((c) => visibleColumns.has(c.key)),
    [visibleColumns],
  );

  const handleStatusChange = useCallback(
    (leadId: number, newStatus: string, leadName: string) => {
      if (newStatus === "CONVERTED") {
        setConversionModal({ leadId, leadName });
        return;
      }
      if (newStatus === "LOST") {
        setLostModal({ leadId, leadName });
        return;
      }
      onStatusChange(leadId, newStatus);
    },
    [onStatusChange],
  );

  const renderCell = useLeadCellRenderer({
    editingCell,
    setEditingCell,
    teamMembers,
    onStatusChange: handleStatusChange,
    onPriorityChange,
    onAssign,
  });

  const fromRow = (page - 1) * pageSize + 1;
  const toRow = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex shrink-0 items-center justify-between px-1 pb-2">
        <span className="text-xs text-muted-foreground tabular-nums">
          {totalCount > 0 ? `${fromRow}–${toRow} of ${totalCount}` : "0 leads"}
        </span>
        <div className="flex items-center gap-1.5">
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-8 w-auto min-w-[5.5rem] gap-1 text-xs" aria-label="Rows per page"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)} className="text-xs">{s}/pg</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Columns3 />Cols
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 max-h-80 overflow-y-auto">
              {ALL_COLUMNS.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={visibleColumns.has(col.key)}
                  onCheckedChange={() => toggleColumn(col.key)}
                  className="text-xs"
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card">
        <div className="min-w-max">
          <table className="w-full caption-bottom text-xs">
            <TableHeader className="sticky top-0 z-sticky bg-surface-sunken">
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="w-10 px-3 py-2">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} className="h-3.5 w-3.5" />
                </TableHead>
                {cols.map((col) => (
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
                      {col.sortable && (
                        <SortIcon column={col.key} sortColumn={sortColumn} sortDirection={sortDirection} />
                      )}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={cols.length + 1} className="h-10 px-3">
                      <Skeleton className="h-3 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={cols.length + 1} className="p-4 hover:bg-transparent">
                    <EmptyState compact illustration={<EmptySearchIllustration />} title="No leads match your filters" className="border-0 bg-transparent" />
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className={cn(
                      "h-10 transition-colors hover:bg-accent/60",
                      selectedIds.has(lead.id) && "bg-brand-soft hover:bg-brand-soft",
                    )}
                  >
                    <TableCell className="px-3 py-1.5">
                      <Checkbox
                        checked={selectedIds.has(lead.id)}
                        onCheckedChange={() => toggleSelect(lead.id)}
                        className="h-3.5 w-3.5"
                      />
                    </TableCell>
                    {cols.map((col) => (
                      <TableCell key={col.key} className="px-3 py-1.5">
                        {renderCell(lead, col.key)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex shrink-0 items-center justify-between px-1 pt-2">
          <span className="text-xs text-muted-foreground tabular-nums">
            Page {page}/{totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}

      <BulkActionsBar
        selectedIds={selectedIds}
        selectedArray={selectedArray}
        leads={leads}
        teamMembers={teamMembers}
        isAdmin={isAdmin}
        onBulkUpdate={onBulkUpdate}
        onBulkDelete={onBulkDelete}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      <ConversionModal
        open={!!conversionModal}
        leadName={conversionModal?.leadName}
        onClose={() => setConversionModal(null)}
        onSubmit={({ conversionNotes, investmentInterest, estimatedAmount, createDeal, dealName }) => {
          if (!conversionModal) return;
          onStatusChange(conversionModal.leadId, "CONVERTED", { conversionNotes, investmentInterest, estimatedAmount, createDeal, dealName });
          setConversionModal(null);
        }}
      />

      <LostModal
        open={!!lostModal}
        leadName={lostModal?.leadName}
        onClose={() => setLostModal(null)}
        onSubmit={({ lostReason, lostNotes }) => {
          if (!lostModal) return;
          onStatusChange(lostModal.leadId, "LOST", { lostReason, lostNotes });
          setLostModal(null);
        }}
      />
    </div>
  );
}
