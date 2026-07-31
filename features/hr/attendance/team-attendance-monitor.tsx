"use client";

import { useMemo, useState, useCallback, useEffect, type ReactNode } from "react";
import { format } from "date-fns";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Search,
  Calendar,
  Users,
  UserCheck,
  Coffee,
  LogOut,
  Palmtree,
  UserX,
  Building2,
  User,
  Briefcase,
  Activity,
  Clock,
  LogIn,
  LayoutGrid,
  SearchX,
  CalendarOff,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { useAttendanceMonitor, type AttendanceMonitorEntry } from "@/lib/api/hooks/hr/attendance";
import { cn } from "@/lib/utils";
import { getTodayString } from "@/lib/date-utils";
import { type PageSizeOption } from "@/lib/pagination-constants";

const TEAM_PAGE_SIZE = 10 as PageSizeOption;

type Status = AttendanceMonitorEntry["status"] | "ALL";

const STATUS_META: Record<
  Exclude<Status, "ALL">,
  { label: string; badge: string; icon: LucideIcon }
> = {
  PRESENT: {
    label: "Present",
    badge: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
    icon: UserCheck,
  },
  ON_BREAK: {
    label: "On Break",
    badge: "bg-amber-500/10 text-amber-600 border-amber-200",
    icon: Coffee,
  },
  CHECKED_OUT: {
    label: "Checked Out",
    badge: "bg-blue-500/10 text-blue-600 border-blue-200",
    icon: LogOut,
  },
  ON_LEAVE: {
    label: "On Leave",
    badge: "bg-purple-500/10 text-purple-600 border-purple-200",
    icon: Palmtree,
  },
  ABSENT: {
    label: "Absent",
    badge: "bg-red-500/10 text-red-600 border-red-200",
    icon: UserX,
  },
};

const FILTER_TABS: { value: Status; label: string; icon: LucideIcon }[] = [
  { value: "ALL", label: "All", icon: LayoutGrid },
  { value: "PRESENT", label: "Present", icon: STATUS_META.PRESENT.icon },
  { value: "ON_BREAK", label: "On Break", icon: STATUS_META.ON_BREAK.icon },
  { value: "CHECKED_OUT", label: "Checked Out", icon: STATUS_META.CHECKED_OUT.icon },
  { value: "ON_LEAVE", label: "On Leave", icon: STATUS_META.ON_LEAVE.icon },
  { value: "ABSENT", label: "Absent", icon: STATUS_META.ABSENT.icon },
];

const SUMMARY_STATS: {
  key: keyof ReturnType<typeof buildCounts>;
  label: string;
  color: string;
  icon: LucideIcon;
}[] = [
  { key: "total", label: "Total", color: "text-foreground", icon: Users },
  { key: "present", label: "Present", color: "text-emerald-600", icon: UserCheck },
  { key: "onBreak", label: "On Break", color: "text-amber-600", icon: Coffee },
  { key: "checkedOut", label: "Checked Out", color: "text-blue-600", icon: LogOut },
  { key: "onLeave", label: "On Leave", color: "text-purple-600", icon: Palmtree },
  { key: "absent", label: "Absent", color: "text-red-600", icon: UserX },
];

function buildCounts(all: AttendanceMonitorEntry[]) {
  return {
    total: all.length,
    present: all.filter((r) => r.status === "PRESENT").length,
    onBreak: all.filter((r) => r.status === "ON_BREAK").length,
    checkedOut: all.filter((r) => r.status === "CHECKED_OUT").length,
    onLeave: all.filter((r) => r.status === "ON_LEAVE").length,
    absent: all.filter((r) => r.status === "ABSENT").length,
  };
}

function fmtTime(ts: string | null | undefined): string {
  if (!ts) return "";
  try {
    return format(new Date(ts), "hh:mm a");
  } catch {
    return "";
  }
}

function todayIso(): string {
  return getTodayString();
}

function TableHeadLabel({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" aria-hidden="true" />
      {children}
    </span>
  );
}

export function TeamAttendanceMonitor() {
  const [date, setDate] = useState(todayIso);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(TEAM_PAGE_SIZE);

  const { data, isLoading } = useAttendanceMonitor(date);

  useEffect(() => {
    setPage(1);
  }, [date, search, statusFilter]);

  const counts = useMemo(() => buildCounts(data ?? []), [data]);

  const rows = useMemo(() => {
    let list = data ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          (r.departmentName?.toLowerCase().includes(q) ?? false),
      );
    }
    if (statusFilter !== "ALL") list = list.filter((r) => r.status === statusFilter);
    return list;
  }, [data, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, safePage, pageSize]);

  const handlePageChange = useCallback((next: number) => {
    setPage(next);
  }, []);

  const handlePageSizeChange = useCallback((limit: number) => {
    setPageSize(limit as PageSizeOption);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("ALL");
  }, []);

  const tableMinHeight = pageSize * 56 + 44;
  const hasSourceData = (data?.length ?? 0) > 0;
  const isFilteredEmpty = !isLoading && hasSourceData && rows.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end justify-between">
        <div className="flex flex-wrap gap-2">
          {SUMMARY_STATS.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="flex flex-col items-center bg-muted/50 rounded-lg px-3 py-2 min-w-[72px]"
              >
                {isLoading ? (
                  <Skeleton className="h-6 w-8 mb-1" />
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", s.color)} aria-hidden="true" />
                    <span className={cn("text-xl font-bold tabular-nums", s.color)}>{counts[s.key]}</span>
                  </div>
                )}
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-end gap-2 shrink-0">
          <div className="space-y-1">
            <Label className="text-xs inline-flex items-center gap-1">
              <Calendar className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
              Date
            </Label>
            <div className="relative">
              <Calendar
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="date"
                className="h-9 w-40 pl-8"
                value={date}
                max={todayIso()}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="Search by name, email, or department…"
            className="h-9 pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search team attendance"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
          {FILTER_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors",
                  active
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="border-b border-border">
            <ScrollArea
              className="w-full max-h-[min(28rem,55vh)]"
              style={{ minHeight: Math.min(tableMinHeight, 448) }}
              type="auto"
              role="region"
              aria-label="Team attendance table"
            >
              <div className="min-w-max">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                    <TableRow className="bg-muted/60 hover:bg-muted/60">
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold pl-4 py-3 w-36">
                        <TableHeadLabel icon={Building2}>Department</TableHeadLabel>
                      </TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold py-3 w-56">
                        <TableHeadLabel icon={User}>Employee</TableHeadLabel>
                      </TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold py-3 w-32">
                        <TableHeadLabel icon={Briefcase}>Role</TableHeadLabel>
                      </TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold py-3 w-28">
                        <TableHeadLabel icon={Activity}>Status</TableHeadLabel>
                      </TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold py-3 w-28">
                        <TableHeadLabel icon={LogIn}>Check In</TableHeadLabel>
                      </TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold py-3 w-28">
                        <TableHeadLabel icon={LogOut}>Check Out</TableHeadLabel>
                      </TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold py-3 pr-4 w-24">
                        <TableHeadLabel icon={Clock}>Hours</TableHeadLabel>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: pageSize }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell className="pl-4"><Skeleton className="h-3 w-24" /></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                              <div className="space-y-1">
                                <Skeleton className="h-3 w-28" />
                                <Skeleton className="h-2.5 w-20" />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><Skeleton className="h-3 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-3 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-3 w-16" /></TableCell>
                          <TableCell className="pr-4"><Skeleton className="h-3 w-12" /></TableCell>
                        </TableRow>
                      ))
                    ) : rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="p-4">
                          <EmptyState
                            compact
                            icon={isFilteredEmpty ? SearchX : CalendarOff}
                            title={
                              isFilteredEmpty
                                ? "No employees match the current filter"
                                : "No attendance records for this date"
                            }
                            description={
                              isFilteredEmpty
                                ? "Try a different status, search term, or clear filters to see the full team."
                                : "Pick another date or check back once employees start checking in."
                            }
                            action={
                              isFilteredEmpty
                                ? { label: "Clear filters", onClick: clearFilters }
                                : undefined
                            }
                            className="border-0 bg-transparent"
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRows.map((emp) => {
                        const meta = STATUS_META[emp.status];
                        const StatusIcon = meta.icon;
                        const initials = emp.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase();
                        const checkIn = fmtTime(emp.checkIn);
                        const checkOut = fmtTime(emp.checkOut);
                        return (
                          <TableRow key={emp.userId} className="hover:bg-muted/30">
                            <TableCell className="pl-4 py-3">
                              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Building2 className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
                                {emp.departmentName ?? "—"}
                              </span>
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8 shrink-0">
                                  {emp.image && <AvatarImage src={emp.image} alt={emp.name} />}
                                  <AvatarFallback className="text-[10px] font-medium">{initials}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <Link
                                    href={`/hr/employees/${emp.userId}?tab=attendance`}
                                    className="text-sm font-medium truncate block hover:text-primary hover:underline underline-offset-2"
                                    title={`View ${emp.name}'s attendance`}
                                  >
                                    {emp.name}
                                  </Link>
                                  <p className="text-[11px] text-muted-foreground truncate">{emp.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-3">
                              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Briefcase className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
                                {emp.designation ?? emp.role.replace(/_/g, " ")}
                              </span>
                            </TableCell>
                            <TableCell className="py-3">
                              <Badge
                                variant="outline"
                                className={cn("text-[11px] font-medium border gap-1", meta.badge)}
                              >
                                <StatusIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
                                {meta.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-3 text-sm tabular-nums">
                              {checkIn ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <LogIn className="h-3 w-3 text-emerald-600 shrink-0" aria-hidden="true" />
                                  {checkIn}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="py-3 text-sm tabular-nums">
                              {checkOut ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <LogOut className="h-3 w-3 text-blue-600 shrink-0" aria-hidden="true" />
                                  {checkOut}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="py-3 pr-4 text-sm tabular-nums">
                              {emp.workHours ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden="true" />
                                  {parseFloat(emp.workHours).toFixed(1)}h
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </div>
          {!isLoading && rows.length > 0 && (
            <div className="border-t border-border px-2 bg-muted/20">
              <DataTablePagination
                page={safePage}
                totalPages={totalPages}
                total={rows.length}
                limit={pageSize}
                onPageChange={handlePageChange}
                onLimitChange={handlePageSizeChange}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
