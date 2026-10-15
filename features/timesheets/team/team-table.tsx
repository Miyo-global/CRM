"use client";

import { memo, useCallback } from "react";
import { Clock, Download, MoreVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/status-pill";
import type { Tone } from "@/lib/design/tones";
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
import { EmptyState } from "@/components/ui/empty-state";
import { resolveImageUrl } from "@/lib/utils";
import type { TimeEntryWithUser } from "@/types/projects";

type TimesheetEntry = TimeEntryWithUser;

const ITEMS_PER_PAGE = 10;

const statusTones: Record<string, Tone> = {
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "danger",
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
    <TableRow className="cursor-pointer" onClick={handleRowClick}>
      <TableCell className="whitespace-nowrap px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarImage src={resolveImageUrl(entry.user?.image)} />
            <AvatarFallback className="bg-brand-soft text-xs font-semibold text-brand-soft-foreground">
              {entry.user?.firstName?.[0]}
              {entry.user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">
            {entry.user?.firstName} {entry.user?.lastName}
          </span>
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap px-4 sm:px-6">
        {entry.ticket?.project?.name ? (
          <Badge variant="secondary">{entry.ticket.project.name}</Badge>
        ) : (
          <span className="text-sm text-muted-foreground">N/A</span>
        )}
      </TableCell>
      <TableCell className="max-w-xs px-4 sm:px-6">
        <p className="truncate text-sm text-muted-foreground" title={entry.description || undefined}>
          {entry.description || "No description provided"}
        </p>
      </TableCell>
      <TableCell className="whitespace-nowrap px-4 text-right sm:px-6">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium tabular-nums">
          <Clock className="size-3.5 text-muted-foreground" aria-hidden="true" />
          {entry.hours || "0"}h
        </span>
      </TableCell>
      <TableCell className="px-4 text-center sm:px-6">
        <StatusPill tone={statusTones[entry.status || "PENDING"] ?? "neutral"} dot>
          {entry.status || "PENDING"}
        </StatusPill>
      </TableCell>
      <TableCell className="px-4 text-right sm:px-6">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDetailClick}
          className="text-muted-foreground"
          aria-label="View details"
        >
          <MoreVertical className="size-4" aria-hidden="true" />
        </Button>
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
      <CardHeader className="border-b pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg font-semibold">Recent Log Entries</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onExportCSV}
              disabled={!timesheets || timesheets.length === 0}
            >
              <Download className="size-4" aria-hidden="true" />
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
              <div className="min-w-176">
              <Table>
                <caption className="sr-only">Team timesheet entries</caption>
                <TableHeader className="sticky top-0 z-sticky bg-surface-sunken">
                  <TableRow>
                    <TableHead
                      scope="col"
                      className="px-4 sm:px-6"
                    >
                      Employee
                    </TableHead>
                    <TableHead
                      scope="col"
                      className="px-4 sm:px-6"
                    >
                      Project
                    </TableHead>
                    <TableHead
                      scope="col"
                      className="px-4 sm:px-6"
                    >
                      Task Description
                    </TableHead>
                    <TableHead
                      scope="col"
                      className="px-4 text-right sm:px-6"
                    >
                      Duration
                    </TableHead>
                    <TableHead
                      scope="col"
                      className="px-4 text-center sm:px-6"
                    >
                      Status
                    </TableHead>
                    <TableHead
                      scope="col"
                      className="w-10 px-4 sm:px-6"
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEntries.length > 0 ? (
                    paginatedEntries.map((entry) => (
                      <EntryRow key={entry.id} entry={entry} onEntryClick={onEntryClick} />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8">
                        <EmptyState
                          compact
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
              <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 sm:px-6">
                <span className="text-xs tabular-nums text-muted-foreground">
                  Showing {(page - 1) * ITEMS_PER_PAGE + 1}-
                  {Math.min(page * ITEMS_PER_PAGE, timesheets.length)} of {timesheets.length} logs
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={handlePrevPage}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={handleNextPage}
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
