"use client";

import { memo, useMemo, useState, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { useHrAttendanceLogs } from "@/lib/api/hooks/hr";
import { useHrEmployees } from "@/lib/api/hooks/hr/employees";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { AttendanceLogRow } from "./attendance-log-row";
import type { Employee } from "@/types/hr";
import { getTodayString } from "@/lib/date-utils";
import { type PageSizeOption } from "@/lib/pagination-constants";

const ATTENDANCE_PAGE_SIZE = 10 as PageSizeOption;

const STATUS_OPTIONS = [
  { value: "PRESENT", label: "Present" },
  { value: "CHECKED_OUT", label: "Checked out" },
  { value: "ON_BREAK", label: "On break" },
  { value: "ABSENT", label: "Absent" },
];

function firstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function today(): string {
  return getTodayString();
}

function employeeLabel(e: Employee): string {
  const full = `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim();
  return full || e.name || e.email;
}

interface DailyHistoryTableProps {
  userId: string;
  isAdmin?: boolean;
}

export const DailyHistoryTable = memo(function DailyHistoryTable({
  userId,
  isAdmin = false,
}: DailyHistoryTableProps) {
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [selectedUserId, setSelectedUserId] = useState(userId);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(ATTENDANCE_PAGE_SIZE);

  const rangeInvalid = !startDate || !endDate || startDate > endDate;
  const queryUserId = isAdmin ? selectedUserId : userId;

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, statusFilters, queryUserId]);

  const { data: employeesData } = useHrEmployees(undefined, { enabled: isAdmin });
  const employees = useMemo<Employee[]>(
    () => (Array.isArray(employeesData) ? employeesData : []),
    [employeesData],
  );

  const employeeOptions = useMemo(
    () =>
      employees.map((e) => ({
        value: e.id,
        label: employeeLabel(e),
      })),
    [employees],
  );

  const { data: logsData, isLoading, isFetching } = useHrAttendanceLogs({
    userId: queryUserId,
    startDate: rangeInvalid ? undefined : startDate,
    endDate: rangeInvalid ? undefined : endDate,
  });

  const logs = useMemo(() => {
    const rows = logsData ?? [];
    if (!statusFilters.length) return rows;
    return rows.filter((log) => statusFilters.includes(log.status || "PRESENT"));
  }, [logsData, statusFilters]);

  const totalPages = Math.max(1, Math.ceil(logs.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedLogs = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return logs.slice(start, start + pageSize);
  }, [logs, safePage, pageSize]);

  const handlePageChange = useCallback((next: number) => {
    setPage(next);
  }, []);

  const handlePageSizeChange = useCallback((limit: number) => {
    setPageSize(limit as PageSizeOption);
    setPage(1);
  }, []);

  const tableLoading = isLoading || isFetching;
  const tableMinHeight = pageSize * 48 + 44;

  return (
    <Card>
      <CardHeader className="pb-3 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">Daily History</CardTitle>
          <button
            className="text-sm text-gold hover:text-gold/80 font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:pointer-events-none shrink-0"
            disabled={rangeInvalid || logs.length === 0}
            onClick={async () => {
              try {
                const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
                const rows = logs.map((log) => ({
                  date: log.date ? format(new Date(log.date), "yyyy-MM-dd") : "",
                  checkIn: log.checkIn ? format(new Date(log.checkIn), "hh:mm a") : "",
                  checkOut: log.checkOut ? format(new Date(log.checkOut), "hh:mm a") : "",
                  totalHours: log.workHours || "",
                  status: log.status || "PRESENT",
                }));
                await downloadXlsx(
                  `attendance-report-${startDate}_to_${endDate}.xlsx`,
                  [
                    {
                      name: "Attendance",
                      columns: [
                        { header: "Date", key: "date", width: 15 },
                        { header: "Check In", key: "checkIn", width: 15 },
                        { header: "Check Out", key: "checkOut", width: 15 },
                        { header: "Total Hours", key: "totalHours", width: 15 },
                        { header: "Status", key: "status", width: 15 },
                      ],
                      rows,
                    },
                  ],
                );
                toast.success("Report downloaded");
              } catch {
                toast.error("Failed to generate report");
              }
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Download Report
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {isAdmin ? (
            <div className="space-y-1.5">
              <Label className="text-xs">
                Employee <span className="text-destructive">*</span>
              </Label>
              <SearchableSelect
                options={employeeOptions}
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                placeholder="Select employee"
                searchPlaceholder="Search employee…"
                emptyText="No employee found."
                triggerClassName="h-9 font-medium"
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label className="text-xs">
              From <span className="text-destructive">*</span>
            </Label>
            <Input
              className="h-9"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              To <span className="text-destructive">*</span>
            </Label>
            <Input
              className="h-9"
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <SearchableMultiSelect
              options={STATUS_OPTIONS}
              values={statusFilters}
              onValuesChange={setStatusFilters}
              placeholder="All statuses"
              searchPlaceholder="Search status…"
              emptyText="No status found."
              selectedLabel={(count) => `${count} statuses`}
              triggerClassName="h-9 font-medium"
            />
          </div>
        </div>

        {rangeInvalid ? (
          <p className="text-xs text-destructive">Pick a valid date range (From must be on or before To).</p>
        ) : null}
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="border border-border rounded-md overflow-hidden flex flex-col">
          <ScrollArea
            className="w-full max-h-[min(28rem,55vh)]"
            style={{ minHeight: Math.min(tableMinHeight, 448) }}
            type="auto"
            role="region"
            aria-label="Attendance records table"
          >
            <div className="min-w-max">
              <Table className="border-collapse">
                <caption className="sr-only">Recent attendance history</caption>
                <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                  <TableRow className="bg-muted/60 hover:bg-muted/60">
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold border border-border px-4 py-2.5 text-foreground">
                      Date
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold border border-border px-4 py-2.5 text-foreground">
                      Check In
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold border border-border px-4 py-2.5 text-foreground">
                      Check Out
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold border border-border px-4 py-2.5 text-foreground">
                      Total Hours
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold border border-border px-4 py-2.5 text-foreground">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableLoading ? (
                    Array.from({ length: pageSize }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5} className="border border-border p-0">
                          <Skeleton className="h-12 w-full rounded-none" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : rangeInvalid ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground border border-border">
                        Select a valid date range to view records.
                      </TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground border border-border">
                        No attendance records found for the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedLogs.map((log, idx) => (
                      <AttendanceLogRow key={log.id} log={log} index={idx} />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>

          {!tableLoading && !rangeInvalid && logs.length > 0 ? (
            <div className="border-t border-border px-2 bg-muted/20">
              <DataTablePagination
                page={safePage}
                totalPages={totalPages}
                total={logs.length}
                limit={pageSize}
                onPageChange={handlePageChange}
                onLimitChange={handlePageSizeChange}
              />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
});
