"use client";

import { memo, useCallback } from "react";
import { Clock, Download, MoreVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyTimeIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { resolveImageUrl } from "@/lib/utils";
import type { TimeEntryWithUser } from "@/types/projects";

type TimesheetEntry = TimeEntryWithUser;

const ITEMS_PER_PAGE = 10;

const statusBadgeStyles: Record<string, string> = {
  APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  REJECTED: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
};


interface EntryRowProps {
  entry: TimesheetEntry;
  onEntryClick: (entry: TimesheetEntry) => void;
}

const EntryRow = memo(function EntryRow({ entry, onEntryClick }: EntryRowProps) {
  const handleRowClick = useCallback(() => onEntryClick(entry), [onEntryClick, entry]);
  const handleDetailClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEntryClick(entry);
  }, [onEntryClick, entry]);

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={handleRowClick}
    >
      <TableCell className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={resolveImageUrl(entry.user?.image)} />
            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
              {entry.user?.firstName?.[0]}
              {entry.user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-semibold">
            {entry.user?.firstName} {entry.user?.lastName}
          </span>
        </div>
      </TableCell>
      <TableCell className="px-6 py-4 whitespace-nowrap">
        {entry.ticket?.project?.name ? (
          <Badge variant="secondary" className="font-medium text-xs">
            {entry.ticket.project.name}
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">N/A</span>
        )}
      </TableCell>
      <TableCell className="px-6 py-4 max-w-xs">
        <p className="text-sm text-muted-foreground truncate">
          {entry.description || "No description provided"}
        </p>
      </TableCell>
      <TableCell className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-bold">{entry.hours || "0"}h</span>
        </div>
      </TableCell>
      <TableCell className="px-6 py-4 text-center">
        <Badge
          className={`text-[10px] font-bold uppercase tracking-wide border-0 ${
            statusBadgeStyles[entry.status || "PENDING"]
          }`}
        >
          {entry.status || "PENDING"}
        </Badge>
      </TableCell>
      <TableCell className="px-6 py-4 text-right">
        <button
          onClick={handleDetailClick}
          className="p-1 hover:text-primary transition-colors"
          aria-label="View details"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </TableCell>
    </TableRow>
  );
});


export interface TeamTableProps {
  timesheets: TimesheetEntry[] | undefined;
  isLoading: boolean;
  paginatedEntries: TimesheetEntry[];
  page: number;
  totalPages: number;
  onPageChange: (updater: (p: number) => number) => void;
  onEntryClick: (entry: TimesheetEntry) => void;
  onExportCSV: () => void;
}

export const TeamTable = memo(function TeamTable({
  timesheets,
  isLoading,
  paginatedEntries,
  page,
  totalPages,
  onPageChange,
  onEntryClick,
  onExportCSV,
}: TeamTableProps) {
  const handlePrevPage = useCallback(() => onPageChange((p) => Math.max(1, p - 1)), [onPageChange]);
  const handleNextPage = useCallback(() => onPageChange((p) => p + 1), [onPageChange]);

  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base font-bold">Recent Log Entries</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={onExportCSV}
              disabled={!timesheets || timesheets.length === 0}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <>
            <ScrollArea
              className="w-full"
              type="auto"
            >
              <div className="min-w-[700px]">
              <Table>
                <caption className="sr-only">Team timesheet entries</caption>
                <TableHeader>
                  <TableRow className="border-b">
                    <TableHead
                      scope="col"
                      className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-6 py-4"
                    >
                      Employee
                    </TableHead>
                    <TableHead
                      scope="col"
                      className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-6 py-4"
                    >
                      Project
                    </TableHead>
                    <TableHead
                      scope="col"
                      className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-6 py-4"
                    >
                      Task Description
                    </TableHead>
                    <TableHead
                      scope="col"
                      className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-6 py-4"
                    >
                      Duration
                    </TableHead>
                    <TableHead
                      scope="col"
                      className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-6 py-4 text-center"
                    >
                      Status
                    </TableHead>
                    <TableHead
                      scope="col"
                      className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-6 py-4 w-10"
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEntries.length > 0 ? (
                    paginatedEntries.map((entry) => (
                      <TableRow
                        key={entry.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => onEntryClick(entry)}
                      >
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={resolveImageUrl(entry.user?.image)} />
                              <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                {entry.user?.firstName?.[0]}
                                {entry.user?.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-semibold">
                              {entry.user?.firstName} {entry.user?.lastName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          {entry.ticket?.project?.name ? (
                            <Badge variant="secondary" className="font-medium text-xs">
                              {entry.ticket.project.name}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4 max-w-xs">
                          <p className="text-sm text-muted-foreground truncate">
                            {entry.description || "No description provided"}
                          </p>
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-bold">{entry.hours || "0"}h</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-center">
                          <Badge
                            className={`text-[10px] font-bold uppercase tracking-wide border-0 ${
                              statusBadgeStyles[entry.status || "PENDING"]
                            }`}
                          >
                            {entry.status || "PENDING"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEntryClick(entry);
                            }}
                            className="p-1 hover:text-primary transition-colors"
                            aria-label="View details"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8">
                        <EmptyState
                          illustration={<EmptyTimeIllustration className="h-28 w-28 opacity-95" />}
                          title="No time entries"
                          description="No time was logged by the team for the selected period."
                          className="border-0 bg-transparent"
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </ScrollArea>

            {timesheets && timesheets.length > 0 && (
              <div className="px-6 py-4 border-t flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Showing {(page - 1) * ITEMS_PER_PAGE + 1}-
                  {Math.min(page * ITEMS_PER_PAGE, timesheets.length)} of {timesheets.length} logs
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={page <= 1}
                    onClick={() => onPageChange((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});
