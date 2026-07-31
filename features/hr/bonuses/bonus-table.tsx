"use client";

import { format } from "date-fns";
import { CheckCircle2 } from "lucide-react";
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
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { formatINR } from "@/lib/format-utils";
import { BONUS_TYPE_LABELS, type BonusType } from "@/lib/validations/bonus";
import type { BonusRow } from "@/lib/hr/bonus-filters";

function statusBadgeVariant(status: string | null): "default" | "secondary" | "outline" {
  if (status === "PAID") return "default";
  if (status === "APPROVED") return "secondary";
  return "outline";
}

interface BonusTableProps {
  rows: BonusRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onMarkPaid: (id: number) => void;
  hasActiveFilters: boolean;
}

export function BonusTable({
  rows,
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  onMarkPaid,
  hasActiveFilters,
}: BonusTableProps) {
  const paginatedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Card>
      <CardContent className="p-0">
        <ScrollArea className="w-full" type="auto">
          <div className="min-w-[760px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <EmptyExpensesIllustration className="h-32 w-32 opacity-95" />
                        <p>{hasActiveFilters ? "No bonuses match your filters." : "No bonuses on record."}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((bonus) => (
                    <TableRow key={bonus.id}>
                      <TableCell className="font-medium">{bonus.employeeName ?? "Employee"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {bonus.type ? (BONUS_TYPE_LABELS[bonus.type as BonusType] ?? bonus.type) : "Bonus"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium tabular-nums">{formatINR(bonus.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(bonus.status)} className="text-[10px]">
                          {bonus.status ?? "PENDING"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {bonus.reason ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {bonus.createdAt ? format(new Date(bonus.createdAt), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {bonus.status !== "PAID" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => onMarkPaid(bonus.id)}
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Mark Paid
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Paid</span>
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
