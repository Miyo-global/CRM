"use client";

import { useState, useMemo, useCallback, useTransition, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { format, eachDayOfInterval, parse, isValid } from "date-fns";
import { useGetWorkLogs, useUpsertWorkLog } from "@/lib/api/hooks/hr";
import { useHrEmployees, useHrDepartments } from "@/lib/api/hooks/hr";
import { Card, CardContent } from "@/components/ui/card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { apiClient } from "@/lib/api-client";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import type { Employee } from "@/types/hr";

import {
  WorkLogFilterActions,
  WorkLogFiltersPanel,
  type WorkLogFilters as WorkLogFiltersType,
} from "@/features/hr/work-logs/work-log-filters";
import { WorkLogMonthGroup } from "@/features/hr/work-logs/work-log-month-group";
import { WorkLogList } from "@/features/hr/work-logs/work-log-list";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTimeIllustration } from "@/components/illustrations";
import { resolveWorkLogWindow, normalizeWorkLogFilters } from "@/lib/hr/work-log-window";
import { normalizeWorkLogPeopleFilters } from "@/lib/hr/work-log-people-filters";
import { resolveWorkLogView } from "@/lib/hr/work-log-view";

export default function WorkLogsPage() {
  const { data: session } = useSession();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentQuarter = Math.floor(currentMonth / 3) + 1;

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const userRole = session?.user?.role;
  const isAdminOrCeo = userRole === "CEO" || userRole === "HR" || userRole === "ADMIN";

  const { data: employeesRaw } = useHrEmployees(isAdminOrCeo ? { limit: 500 } : undefined);
  const { data: departments } = useHrDepartments();

  const employees = useMemo(
    () => (Array.isArray(employeesRaw) ? employeesRaw : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[],
    [employeesRaw],
  );

  const filters = useMemo<WorkLogFiltersType>(() => {
    const monthParam = searchParams.get("month");
    const base = normalizeWorkLogFilters({
      year: parseInt(searchParams.get("year") ?? "") || currentYear,
      quarter: parseInt(searchParams.get("quarter") ?? "") || currentQuarter,
      selectedUserId: searchParams.get("user") ?? undefined,
      departmentId: searchParams.get("dept") ?? undefined,
      month: monthParam !== null ? parseInt(monthParam) : undefined,
      dateFrom: searchParams.get("from") ?? undefined,
      dateTo: searchParams.get("to") ?? undefined,
      viewAllTeam: searchParams.get("scope") === "all",
    });
    return employees.length > 0
      ? normalizeWorkLogPeopleFilters(base, employees)
      : base;
  }, [searchParams, currentYear, currentQuarter, employees]);

  const setFilters = useCallback(
    (update: WorkLogFiltersType | ((prev: WorkLogFiltersType) => WorkLogFiltersType)) => {
      const newFilters = normalizeWorkLogFilters(
        normalizeWorkLogPeopleFilters(
          typeof update === "function" ? update(filters) : update,
          employees,
        ),
      );
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (newFilters.year !== currentYear) params.set("year", String(newFilters.year));
        else params.delete("year");
        if (newFilters.quarter !== currentQuarter) params.set("quarter", String(newFilters.quarter));
        else params.delete("quarter");
        if (newFilters.selectedUserId) params.set("user", newFilters.selectedUserId);
        else params.delete("user");
        if (newFilters.departmentId) params.set("dept", newFilters.departmentId);
        else params.delete("dept");
        if (newFilters.month != null) params.set("month", String(newFilters.month));
        else params.delete("month");
        if (newFilters.dateFrom) params.set("from", newFilters.dateFrom);
        else params.delete("from");
        if (newFilters.dateTo) params.set("to", newFilters.dateTo);
        else params.delete("to");
        if (newFilters.viewAllTeam) params.set("scope", "all");
        else params.delete("scope");
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [filters, searchParams, pathname, router, currentYear, currentQuarter, employees],
  );

  useEffect(() => {
    const urlFrom = searchParams.get("from") ?? undefined;
    const urlTo = searchParams.get("to") ?? undefined;
    if (filters.dateFrom === urlFrom && filters.dateTo === urlTo) return;

    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (filters.dateFrom) params.set("from", filters.dateFrom);
      else params.delete("from");
      if (filters.dateTo) params.set("to", filters.dateTo);
      else params.delete("to");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }, [filters.dateFrom, filters.dateTo, searchParams, pathname, router]);

  const [draftFilters, setDraftFilters] = useState<WorkLogFiltersType>(() => {
    const monthParam = searchParams.get("month");
    return {
      year: parseInt(searchParams.get("year") ?? "") || currentYear,
      quarter: parseInt(searchParams.get("quarter") ?? "") || currentQuarter,
      selectedUserId: searchParams.get("user") ?? undefined,
      departmentId: searchParams.get("dept") ?? undefined,
      month: monthParam !== null ? parseInt(monthParam) : undefined,
      dateFrom: searchParams.get("from") ?? undefined,
      dateTo: searchParams.get("to") ?? undefined,
      viewAllTeam: searchParams.get("scope") === "all",
    };
  });

  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");

  const year = filters.year;
  const quarter = filters.quarter;
  const selectedUserId = filters.selectedUserId;

  const currentUserId = session?.user?.id;

  const { effectiveUserId, isMultiUser, isSelfView } = useMemo(
    () =>
      resolveWorkLogView({
        role: userRole,
        currentUserId,
        selectedUserId: filters.selectedUserId,
        viewAllTeam: filters.viewAllTeam,
      }),
    [userRole, currentUserId, filters.selectedUserId, filters.viewAllTeam],
  );

  const filteredEmployees = useMemo(() => {
    return employees
      .sort((a, b) => {
        const nameA = `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim().toLowerCase();
        const nameB = `${b.firstName ?? ""} ${b.lastName ?? ""}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [employees]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.selectedUserId) count++;
    if (filters.viewAllTeam) count++;
    if (filters.departmentId) count++;
    if (filters.month !== undefined) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.year !== currentYear) count++;
    if (filters.quarter !== currentQuarter) count++;
    return count;
  }, [filters, currentYear, currentQuarter]);

  const joiningYear = useMemo(() => {
    if (!employees.length) return currentYear;
    const targetId = draftFilters.selectedUserId || session?.user?.id;
    const emp = employees.find(e => e.id === targetId);
    if (emp?.joiningDate) return new Date(emp.joiningDate).getFullYear();
    return currentYear;
  }, [employees, draftFilters.selectedUserId, session?.user?.id, currentYear]);

  const availableYears = useMemo(() => {
    const years = [];
    for (let y = joiningYear; y <= currentYear; y++) years.push(y);
    return years.length > 0 ? years : [currentYear];
  }, [joiningYear, currentYear]);

  const toggleMonth = useCallback((monthKey: string) => {
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(monthKey)) next.delete(monthKey);
      else next.add(monthKey);
      return next;
    });
  }, []);

  const { data: logs, isLoading } = useGetWorkLogs({
    year,
    quarter,
    ...(effectiveUserId ? { userId: effectiveUserId } : {}),
    ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
    ...(filters.month != null ? { month: filters.month } : {}),
    ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
    ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
  });

  const upsertLog = useUpsertWorkLog({
    onError: (error) => {
      toast.error(getErrorMessage(error) || "Failed to save work log");
    },
  });

  const workWindow = useMemo(
    () =>
      resolveWorkLogWindow({
        year,
        quarter,
        month: filters.month,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      }),
    [year, quarter, filters.month, filters.dateFrom, filters.dateTo]
  );

  const days = useMemo(() => {
    const toLocal = (s: string) => {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(y!, m! - 1, d!);
    };
    return eachDayOfInterval({ start: toLocal(workWindow.startDate), end: toLocal(workWindow.endDate) });
  }, [workWindow]);

  const monthGroups = useMemo(() => {
    const groups: { monthKey: string; label: string; days: Date[] }[] = [];
    let currentGroup: (typeof groups)[number] | null = null;

    for (const date of days) {
      const monthKey = format(date, "yyyy-MM");
      const label = format(date, "MMMM yyyy");
      if (!currentGroup || currentGroup.monthKey !== monthKey) {
        currentGroup = { monthKey, label, days: [] };
        groups.push(currentGroup);
      }
      currentGroup.days.push(date);
    }
    return groups;
  }, [days]);

  const filledCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!logs) return counts;
    for (const group of monthGroups) {
      counts[group.monthKey] = group.days.filter((d) => {
        const dateStr = format(d, "yyyy-MM-dd");
        return logs.some((l) => l.date === dateStr && l.description);
      }).length;
    }
    return counts;
  }, [logs, monthGroups]);

  const filterDay = useCallback(
    (date: Date) => {
      const dateStr = format(date, "yyyy-MM-dd");

      if (!searchTerm.trim()) return true;
      const term = searchTerm.trim().toLowerCase();
      const log = logs?.find((l) => l.date === dateStr);

      const dateDisplay = format(date, "dd MMM yyyy EEEE").toLowerCase();
      if (dateDisplay.includes(term)) return true;

      const dateFormats = ["d MMM yyyy", "yyyy-MM-dd", "dd/MM/yyyy", "MM/dd/yyyy", "d MMMM yyyy"];
      for (const fmt of dateFormats) {
        const parsed = parse(term, fmt, new Date());
        if (isValid(parsed) && format(parsed, "yyyy-MM-dd") === dateStr) return true;
      }

      if (log?.description?.toLowerCase().includes(term)) return true;

      return false;
    },
    [searchTerm, logs],
  );

  const hasSearchResults = useMemo(() => {
    return days.some(filterDay);
  }, [days, filterDay]);

  const handleExportWorkLogs = useCallback(async () => {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Work Logs");

      const employeeName = effectiveUserId && employees.length
        ? `${employees.find((e) => e.id === effectiveUserId)?.firstName ?? ""} ${employees.find((e) => e.id === effectiveUserId)?.lastName ?? ""}`.trim()
        : "My";

      sheet.columns = [
        { header: "Date", key: "date", width: 15 },
        { header: "Day", key: "day", width: 12 },
        { header: "Description", key: "description", width: 40 },
        { header: "Work Link", key: "workLink", width: 28 },
        { header: "Day Type", key: "dayType", width: 14 },
        { header: "Leave / Holiday", key: "dayNote", width: 28 },
        { header: "Status", key: "status", width: 12 },
      ];

      const targetUser = effectiveUserId ?? session?.user?.id;
      const rangeStart = workWindow.startDate;
      const rangeEnd = workWindow.endDate;

      let holidayByDate = new Map<string, string>();
      let leaveByDate = new Map<string, string>();
      try {
        const [holidayRows, leaveRows] = await Promise.all([
          apiClient.get<Array<{ date: string; name: string }>>("/hr/holidays", {
            from: rangeStart,
            to: rangeEnd,
          }),
          targetUser
            ? apiClient.get<{ requests?: Array<{ startDate: string; endDate: string; reason?: string; status: string }> }>(
                "/hr/leaves",
              )
            : Promise.resolve({ requests: [] }),
        ]);
        for (const h of holidayRows ?? []) {
          if (h.date) holidayByDate.set(h.date.slice(0, 10), h.name);
        }
        for (const lr of leaveRows?.requests ?? []) {
          if (lr.status !== "APPROVED") continue;
          const start = new Date(lr.startDate);
          const end = new Date(lr.endDate);
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const ds = format(d, "yyyy-MM-dd");
            if (ds >= rangeStart && ds <= rangeEnd) {
              leaveByDate.set(ds, lr.reason ?? "Approved leave");
            }
          }
        }
      } catch {
        holidayByDate = new Map();
        leaveByDate = new Map();
      }

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

      const filteredDays = days.filter(filterDay);
      for (const date of filteredDays) {
        const dateStr = format(date, "yyyy-MM-dd");
        const log = logs?.find((l) => l.date === dateStr);
        const holidayName = holidayByDate.get(dateStr);
        const leaveReason = leaveByDate.get(dateStr);
        sheet.addRow({
          date: format(date, "dd MMM yyyy"),
          day: format(date, "EEEE"),
          description: log?.description || "",
          workLink: log?.workLink || "",
          dayType: holidayName ? "Holiday" : leaveReason ? "Leave" : log?.description ? "Work" : "",
          dayNote: holidayName ?? leaveReason ?? "",
          status: log?.status === "PENDING" || log?.status === "SAVED" ? "LOGGED" : (log?.status || (log?.description ? "LOGGED" : "")),
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `work-logs-${employeeName}-Q${quarter}-${year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Work logs exported successfully");
    } catch {
      toast.error("Failed to export work logs");
    }
  }, [days, logs, effectiveUserId, employees, quarter, year, filterDay, session?.user?.id, workWindow]);

  const subtitle = useMemo(() => {
    if (isMultiUser) return "Viewing all employees' work logs.";
    if (isSelfView) return "Track your daily tasks and activities.";
    if (effectiveUserId) {
      const emp = employees.find((e) => e.id === effectiveUserId);
      const name = emp
        ? `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim()
        : "employee";
      return `Viewing logs for ${name}.`;
    }
    return "Track your daily tasks and activities.";
  }, [isMultiUser, isSelfView, effectiveUserId, employees]);

  const sharedFilterProps = {
    filters,
    setFilters,
    draftFilters,
    setDraftFilters,
    activeFilterCount,
    availableYears,
    currentYear,
    currentQuarter,
    employees: filteredEmployees,
    departments,
    isAdminOrCeo,
    userRole,
    currentUserId,
    employeeSearchOpen,
    setEmployeeSearchOpen,
    employeeSearch,
    setEmployeeSearch,
  };

  return (
    <PageWrapper
      title="Work Logs"
      subtitle={subtitle}
      actions={
        <WorkLogFilterActions
          {...sharedFilterProps}
          onExport={handleExportWorkLogs}
        />
      }
      filters={
        <WorkLogFiltersPanel
          {...sharedFilterProps}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
      }
    >
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex justify-center" role="status" aria-label="Loading work logs">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
              </div>
            </CardContent>
          </Card>
        ) : isMultiUser ? (
          <WorkLogList logs={logs ?? []} searchTerm={searchTerm} />
        ) : !hasSearchResults ? (
          <Card>
            <CardContent className="py-12">
              <EmptyState
                illustration={<EmptyTimeIllustration className="h-32 w-32 opacity-95" />}
                title="No matches"
                description="Try adjusting your search or filters."
                action={{ label: "Clear filters", onClick: () => setSearchTerm("") }}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {monthGroups.map((group) => {
              const filteredDays = group.days.filter(filterDay);
              if (filteredDays.length === 0) return null;

              const isCollapsed = collapsedMonths.has(group.monthKey);
              const filled = filledCounts[group.monthKey] ?? 0;
              const displayDays = filteredDays;

              return (
                <WorkLogMonthGroup
                  key={group.monthKey}
                  monthKey={group.monthKey}
                  label={group.label}
                  allDays={group.days}
                  displayDays={displayDays}
                  isCollapsed={isCollapsed}
                  onToggle={toggleMonth}
                  filled={filled}
                  searchTerm={searchTerm}
                  logs={logs}
                  selectedUserId={effectiveUserId}
                  currentUserId={session?.user?.id}
                  isAdminOrCeo={isAdminOrCeo}
                  onSave={(date, content, workLink) => upsertLog.mutateAsync({ date, description: content, workLink })}
                  isSaving={upsertLog.isPending}
                />
              );
            })}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
