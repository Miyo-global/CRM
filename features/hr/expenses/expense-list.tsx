"use client";

import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { AdminExpenseItem, MemberExpenseItem } from "./expense-item";
import type { ExpenseWithRelations } from "@/server/actions/expense-query";
import type { ExpenseToEdit } from "@/app/(dashboard)/hr/expenses/create-expense-dialog";
import { EXPENSE_PAGE_SIZE_OPTIONS, type StatusFilter } from "./expense-constants";

interface PaginationProps {
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  startItem: number;
  endItem: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  variant?: "admin" | "member";
}

function ExpensePagination({
  pagination,
  startItem,
  endItem,
  totalPages,
  onPageChange,
  onPageSizeChange,
  variant = "member",
}: PaginationProps) {
  if (pagination.total === 0) return null;

  const pageSizeSelect =
    onPageSizeChange != null ? (
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Per page</span>
        <Select
          value={String(pagination.pageSize)}
          onValueChange={(v) => onPageSizeChange(parseInt(v, 10))}
        >
          <SelectTrigger className="h-8 w-[72px] text-xs" aria-label="Rows per page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXPENSE_PAGE_SIZE_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)} className="text-xs">
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ) : null;

  if (variant === "admin") {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-t bg-muted/10">
        <span className="text-sm text-muted-foreground">
          Showing <strong className="text-foreground">{startItem}</strong> to{" "}
          <strong className="text-foreground">{endItem}</strong> of{" "}
          <strong className="text-foreground">{pagination.total}</strong> results
        </span>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {pageSizeSelect}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={pagination.page <= 1}
                onClick={() => onPageChange(pagination.page - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {(() => {
                const maxVisible = 5;
                let start = Math.max(1, pagination.page - Math.floor(maxVisible / 2));
                const end = Math.min(totalPages, start + maxVisible - 1);
                start = Math.max(1, end - maxVisible + 1);
                return Array.from({ length: end - start + 1 }, (_, i) => start + i);
              })().map((p) => (
                <Button
                  key={p}
                  variant={p === pagination.page ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8 text-xs"
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={pagination.page >= totalPages}
                onClick={() => onPageChange(pagination.page + 1)}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-t">
      <span className="text-sm text-muted-foreground">
        Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of{" "}
        <strong>{pagination.total}</strong> claims
      </span>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {pageSizeSelect}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {pagination.page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={pagination.page >= totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

interface AdminExpenseListProps {
  expenses: ExpenseWithRelations[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  startItem: number;
  endItem: number;
  totalPages: number;
  statusFilter: StatusFilter;
  rejectingId: number | null;
  rejectionReason: string;
  isPending: boolean;
  currentUserId?: string;
  onApprove: (id: number) => void;
  onRejectStart: (id: number) => void;
  onRejectConfirm: (id: number) => void;
  onRejectCancel: () => void;
  onRejectionReasonChange: (reason: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onShowAll: () => void;
}

export function AdminExpenseList({
  expenses,
  pagination,
  startItem,
  endItem,
  totalPages,
  statusFilter,
  rejectingId,
  rejectionReason,
  isPending,
  currentUserId,
  onApprove,
  onRejectStart,
  onRejectConfirm,
  onRejectCancel,
  onRejectionReasonChange,
  onPageChange,
  onPageSizeChange,
  onShowAll,
}: AdminExpenseListProps) {
  return (
    <Card className="shadow-sm border">
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-base font-semibold">Recent Claims</h3>
          <span className="text-sm text-muted-foreground">
            Showing {startItem}-{endItem} of {pagination.total}{" "}
            {statusFilter === "PENDING" ? "pending" : "total"}
          </span>
        </div>

        {expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <EmptyExpensesIllustration className="mb-3" />
            <h3 className="text-lg font-medium">No expenses found</h3>
            <p className="text-muted-foreground mb-4">
              {statusFilter !== "ALL" ? "Try adjusting your filters" : "No expense claims to review"}
            </p>
            {statusFilter !== "ALL" && (
              <Button variant="outline" onClick={onShowAll}>
                Show All Claims
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {expenses.map((expense) => (
              <AdminExpenseItem
                key={expense.id}
                expense={expense}
                rejectingId={rejectingId}
                rejectionReason={rejectionReason}
                isPending={isPending}
                currentUserId={currentUserId}
                onApprove={onApprove}
                onRejectStart={onRejectStart}
                onRejectConfirm={onRejectConfirm}
                onRejectCancel={onRejectCancel}
                onRejectionReasonChange={onRejectionReasonChange}
              />
            ))}
          </div>
        )}

        <ExpensePagination
          pagination={pagination}
          startItem={startItem}
          endItem={endItem}
          totalPages={totalPages}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          variant="admin"
        />
      </CardContent>
    </Card>
  );
}

interface MemberExpenseListProps {
  expenses: ExpenseWithRelations[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  startItem: number;
  endItem: number;
  totalPages: number;
  statusFilter: StatusFilter;
  activeFilterCount: number;
  onEdit: (expense: ExpenseToEdit) => void;
  onResubmit: (expense: ExpenseWithRelations) => void;
  onShowAll: () => void;
  onCreateNew: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function MemberExpenseList({
  expenses,
  pagination,
  startItem,
  endItem,
  totalPages,
  statusFilter,
  activeFilterCount,
  onEdit,
  onResubmit,
  onShowAll,
  onCreateNew,
  onPageChange,
  onPageSizeChange,
}: MemberExpenseListProps) {
  return (
    <Card className="overflow-hidden shadow-sm border">
      <CardContent className="p-0" aria-live="polite">
        {expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <EmptyExpensesIllustration className="mb-3" />
            <h3 className="text-lg font-medium">No expenses found</h3>
            <p className="text-muted-foreground mb-4">
              {statusFilter !== "ALL" || activeFilterCount > 0
                ? "Try adjusting your filters"
                : "Submit your first expense claim to get started"}
            </p>
            {statusFilter !== "ALL" ? (
              <Button variant="outline" onClick={onShowAll}>
                Show All Claims
              </Button>
            ) : (
              <Button className="bg-gold hover:bg-gold/80 text-white" onClick={onCreateNew}>
                <Plus className="mr-2 h-4 w-4" />
                Submit New Claim
              </Button>
            )}
          </div>
        ) : (
          <>
            <ScrollArea className="w-full max-h-[60vh]" type="auto" role="region" aria-label="Expense claims table">
              <div className="min-w-[640px]">
              <Table>
                <caption className="sr-only">Expense claims</caption>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead scope="col" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Claim ID</TableHead>
                    <TableHead scope="col" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Date</TableHead>
                    <TableHead scope="col" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Category</TableHead>
                    <TableHead scope="col" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Description</TableHead>
                    <TableHead scope="col" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Amount</TableHead>
                    <TableHead scope="col" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Status</TableHead>
                    <TableHead scope="col" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <MemberExpenseItem
                      key={expense.id}
                      expense={expense}
                      onEdit={onEdit}
                      onResubmit={onResubmit}
                    />
                  ))}
                </TableBody>
              </Table>
              </div>
            </ScrollArea>

            <ExpensePagination
              pagination={pagination}
              startItem={startItem}
              endItem={endItem}
              totalPages={totalPages}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
              variant="member"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
