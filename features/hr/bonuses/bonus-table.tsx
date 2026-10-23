"use client";

import { format } from "date-fns";
import { Ban, Check, CheckCircle2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import type { Tone } from "@/lib/design/tones";
import { formatINR } from "@/lib/format-utils";
import { BONUS_TYPE_LABELS, type BonusType } from "@/lib/validations/bonus";
import type { BonusRow } from "@/lib/hr/bonus-filters";

function statusTone(status: string | null): Tone {
  if (status === "PAID") return "success";
  if (status === "APPROVED") return "info";
  if (status === "REJECTED") return "danger";
  if (status === "CANCELLED") return "neutral";
  return "warning";
}

interface BonusTableProps {
  rows: BonusRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onApprove: (id: number) => void;
  onMarkPaid: (id: number) => void;
  onEdit: (bonus: BonusRow) => void;
  onCancel: (id: number) => void;
  hasActiveFilters: boolean;
  /** Shown as the filtered-empty action when provided. */
  onClearFilters?: () => void;
}

export function BonusTable({
  rows,
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  onApprove,
  onMarkPaid,
  onEdit,
  onCancel,
  hasActiveFilters,
  onClearFilters,
}: BonusTableProps) {
  const paginatedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardContent className="p-0">
        <ScrollArea className="w-full" type="auto">
          <div className="min-w-[760px]">
            <Table>
              <TableHeader className="sticky top-0 z-sticky bg-card">
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-44 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-4">
                      <EmptyState
                        compact
                        className="border-0 bg-transparent"
                        title={hasActiveFilters ? "No results for these filters" : "No bonuses yet"}
                        description={hasActiveFilters ? "No bonuses match your filters." : "No bonuses on record."}
                        action={hasActiveFilters && onClearFilters ? { label: "Clear filters", onClick: onClearFilters } : undefined}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((bonus) => (
                    <TableRow key={bonus.id}>
                      <TableCell className="font-medium">{bonus.employeeName ?? "Employee"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {bonus.type ? (BONUS_TYPE_LABELS[bonus.type as BonusType] ?? bonus.type) : "Bonus"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatINR(bonus.amount)}</TableCell>
                      <TableCell>
                        <StatusPill tone={statusTone(bonus.status)} dot>
                          {bonus.status ?? "PENDING"}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="max-w-52 truncate text-muted-foreground" title={bonus.reason ?? undefined}>
                        {bonus.reason ?? "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                        {bonus.createdAt ? format(new Date(bonus.createdAt), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {/* Pending → Approved → Paid; edit or cancel before payment (R2-CRUD-05). */}
                        {(bonus.status ?? "PENDING") === "PENDING" ? (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => onApprove(bonus.id)}>
                              <Check className="size-4" aria-hidden="true" />
                              Approve
                            </Button>
                            <Button size="icon-sm" variant="ghost" aria-label="Edit bonus" title="Edit" onClick={() => onEdit(bonus)}>
                              <Pencil className="size-4" aria-hidden="true" />
                            </Button>
                            <Button size="icon-sm" variant="ghost" aria-label="Cancel bonus" title="Cancel" onClick={() => onCancel(bonus.id)}>
                              <Ban className="size-4" aria-hidden="true" />
                            </Button>
                          </div>
                        ) : bonus.status === "APPROVED" ? (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => onMarkPaid(bonus.id)}>
                              <CheckCircle2 className="size-4" aria-hidden="true" />
                              Mark Paid
                            </Button>
                            <Button size="icon-sm" variant="ghost" aria-label="Cancel bonus" title="Cancel" onClick={() => onCancel(bonus.id)}>
                              <Ban className="size-4" aria-hidden="true" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
        <div className="border-t px-2">
          <DataTablePagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={pageSize}
            onPageChange={onPageChange}
            onLimitChange={onPageSizeChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}
