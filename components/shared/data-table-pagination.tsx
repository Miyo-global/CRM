"use client";

import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { PAGE_SIZE_OPTIONS } from "@/lib/pagination-constants";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

export function DataTablePagination({
  page, totalPages, total, limit, onPageChange, onLimitChange,
}: PaginationProps) {
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      const rangeStart = Math.max(2, page - 1);
      const rangeEnd = Math.min(totalPages - 1, page + 1);
      for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  if (total === 0) return null;

  return (
    <div
      data-slot="data-table-pagination"
      className="flex min-h-11 flex-col items-center justify-between gap-2 border-t border-border px-3 py-1.5 sm:flex-row"
    >
      <span className="text-xs text-muted-foreground tabular-nums">
        Showing {start}–{end} of {total}
      </span>

      <div className="flex items-center gap-3">
        {onLimitChange && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">Rows per page</span>
            <Select value={String(limit)} onValueChange={(v) => onLimitChange(Number(v))}>
              <SelectTrigger className="h-8 w-auto min-w-16 gap-1 text-xs tabular-nums" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)} className="text-xs tabular-nums">{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon-sm" disabled={page <= 1} onClick={() => onPageChange(1)} aria-label="First page">
            <ChevronsLeft />
          </Button>
          <Button variant="ghost" size="icon-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
            <ChevronLeft />
          </Button>

          <div className="hidden sm:flex items-center gap-0.5">
            {getPageNumbers().map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-1 text-xs text-subtle-foreground">…</span>
              ) : (
                <Button
                  key={p}
                  variant={p === page ? "default" : "ghost"}
                  size="icon-sm"
                  className="text-xs tabular-nums"
                  aria-current={p === page ? "page" : undefined}
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </Button>
              )
            )}
          </div>
          <span className="sm:hidden px-2 text-xs text-muted-foreground tabular-nums">{page}/{totalPages}</span>

          <Button variant="ghost" size="icon-sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
            <ChevronRight />
          </Button>
          <Button variant="ghost" size="icon-sm" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)} aria-label="Last page">
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
