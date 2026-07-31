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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-1">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Showing {start}-{end} of {total}</span>
        {onLimitChange && (
          <Select value={String(limit)} onValueChange={(v) => onLimitChange(Number(v))}>
            <SelectTrigger className="h-7 w-[70px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => onPageChange(1)} aria-label="First page">
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers().map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">...</span>
            ) : (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="icon"
                className={`h-7 w-7 text-xs ${p === page ? "bg-gold hover:bg-gold/80 text-white" : ""}`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            )
          )}
        </div>
        <span className="sm:hidden text-xs text-muted-foreground px-2">{page}/{totalPages}</span>

        <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)} aria-label="Last page">
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
