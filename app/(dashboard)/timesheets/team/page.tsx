"use client";

import { useState, useMemo, useCallback, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { useAllTeamTimesheets, useProjects } from "@/lib/api/hooks/projects";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import type { TimeEntryWithUser } from "@/types/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { TimeEntryDetailSheet } from "@/components/timesheets/time-entry-detail-sheet";
import { LogTimeDialog } from "@/components/timesheets/log-time-dialog";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { WeeklyProductivityChart } from "@/features/timesheets/team/weekly-productivity-chart";
import { ViewSettingsCard } from "@/features/timesheets/team/view-settings-card";
import { TeamSummary } from "@/features/timesheets/team/team-summary";
import { TeamTable } from "@/features/timesheets/team/team-table";
import { DashboardGate } from "@/components/shared/dashboard-gate";

type TimesheetEntry = TimeEntryWithUser;
type ViewMode = "day" | "week" | "month";

const ITEMS_PER_PAGE = 10;

export default function TeamTimesheetsPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR", "BRANCH_MANAGER"]}>
      <TeamTimesheetsContent />
    </DashboardGate>
  );
}

function TeamTimesheetsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const viewMode = (searchParams.get("view") ?? "week") as ViewMode;
  const selectedEmployee = searchParams.get("emp") ?? "all";
  const selectedProject = searchParams.get("project") ?? "all";
  const selectedStatus = searchParams.get("status") ?? "all";
  const page = parseInt(searchParams.get("page") ?? "1") || 1;

  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedEntry, setSelectedEntry] = useState<TimesheetEntry | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        for (const [k, v] of Object.entries(updates)) {
          if (v === null) params.delete(k);
          else params.set(k, v);
        }
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, pathname, router],
  );

  const dateRange = useMemo(() => {
    const today = new Date();
    switch (viewMode) {
      case "day":
        return { start: format(today, "yyyy-MM-dd"), end: format(today, "yyyy-MM-dd") };
      case "week":
        return {
          start: format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"),
          end: format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        };
      case "month":
        return {
          start: format(startOfMonth(today), "yyyy-MM-dd"),
          end: format(endOfMonth(today), "yyyy-MM-dd"),
        };
    }
  }, [viewMode]);

  const prevWeekRange = useMemo(() => {
    const today = new Date();
    const prevStart = startOfWeek(subDays(today, 7), { weekStartsOn: 1 });
    const prevEnd = endOfWeek(subDays(today, 7), { weekStartsOn: 1 });
    return { start: format(prevStart, "yyyy-MM-dd"), end: format(prevEnd, "yyyy-MM-dd") };
  }, []);

  const { data: timesheets, isLoading } = useAllTeamTimesheets({
    userId: selectedEmployee === "all" ? undefined : selectedEmployee,
    projectId: selectedProject === "all" ? undefined : parseInt(selectedProject),
    startDate: dateRange.start,
    endDate: dateRange.end,
    status:
      selectedStatus === "all"
        ? undefined
        : (selectedStatus as "PENDING" | "APPROVED" | "REJECTED"),
  });

  const { data: prevWeekTimesheets } = useAllTeamTimesheets({
    startDate: prevWeekRange.start,
    endDate: prevWeekRange.end,
  });

  const { data: employeesData } = useHrEmployees();
  const employees = Array.isArray(employeesData) ? employeesData : employeesData?.data ?? [];

  const { data: projectsData } = useProjects();
  const projects = projectsData?.data ?? [];

  const statistics = useMemo(() => {
    if (!timesheets)
      return { totalHours: 0, uniqueEmployees: 0, uniqueProjects: 0, avgHoursPerDay: 0 };
    const totalHours = timesheets.reduce((sum, e) => sum + parseFloat(e.hours || "0"), 0);
    const uniqueEmployees = new Set(timesheets.map((e) => e.userId)).size;
    const uniqueProjects = new Set(
      timesheets.filter((e) => e.ticket?.projectId).map((e) => e.ticket?.projectId)
    ).size;
    const uniqueDates = new Set(timesheets.map((e) => e.date)).size;
    const avgHoursPerDay = uniqueDates > 0 ? totalHours / uniqueDates : 0;
    return { totalHours, uniqueEmployees, uniqueProjects, avgHoursPerDay };
  }, [timesheets]);

  const prevWeekHours = useMemo(() => {
    if (!prevWeekTimesheets) return 0;
    return prevWeekTimesheets.reduce((sum, e) => sum + parseFloat(e.hours || "0"), 0);
  }, [prevWeekTimesheets]);

  const paginatedEntries = useMemo(() => {
    if (!timesheets) return [];
    const startIdx = (page - 1) * ITEMS_PER_PAGE;
    return timesheets.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [timesheets, page]);

  const totalPages = timesheets ? Math.ceil(timesheets.length / ITEMS_PER_PAGE) : 0;

  const exportToCSV = useCallback(() => {
    if (!timesheets || timesheets.length === 0) return;
    try {
      const headers = ["Employee", "Date", "Project", "Ticket", "Hours", "Description", "Status"];
      const rows = timesheets.map((entry) => [
        `${entry.user?.firstName || ""} ${entry.user?.lastName || ""}`.trim(),
        format(new Date(entry.date), "yyyy-MM-dd"),
        entry.ticket?.project?.name || "N/A",
        entry.ticketId ? `#${entry.ticketId}` : "N/A",
        entry.hours || "0",
        entry.description || "",
        entry.status || "PENDING",
      ]);
      const escapeCell = (value: string) => {
        let cell = String(value ?? "");
        if (/^[=+\-@]/.test(cell)) cell = `'${cell}`;
        return `"${cell.replace(/"/g, '""')}"`;
      };
      const csvContent = [
        headers.map(escapeCell).join(","),
        ...rows.map((row) => row.map(escapeCell).join(",")),
      ].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `team-timesheets-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported successfully");
    } catch {
      toast.error("Failed to export CSV. Please try again.");
    }
  }, [timesheets]);

  const handleEntryClick = useCallback((entry: TimesheetEntry) => {
    setSelectedEntry(entry);
    setDetailSheetOpen(true);
  }, []);

  const handleDateSelect = useCallback((_date: Date) => {
    updateParams({ view: "day" });
  }, [updateParams]);

  return (
    <PageWrapper
      title="Daily Work Logs"
      subtitle="Monitor team efficiency and task allocation for HR performance reviews."
      actions={
        <LogTimeDialog
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add New Log
            </Button>
          }
        />
      }
    >
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <WeeklyProductivityChart
            timesheets={timesheets}
            totalHours={statistics.totalHours}
            prevWeekHours={prevWeekHours}
          />
          <ViewSettingsCard
            viewMode={viewMode}
            onViewModeChange={(v) => updateParams({ view: v === "week" ? null : v, page: null })}
            selectedEmployee={selectedEmployee}
            onEmployeeChange={(v) => updateParams({ emp: v === "all" ? null : v, page: null })}
            selectedProject={selectedProject}
            onProjectChange={(v) => updateParams({ project: v === "all" ? null : v, page: null })}
            selectedStatus={selectedStatus}
            onStatusChange={(v) => updateParams({ status: v === "all" ? null : v, page: null })}
            employees={employees}
            projects={projects}
            calendarMonth={calendarMonth}
            onCalendarMonthChange={setCalendarMonth}
            onDateSelect={handleDateSelect}
          />
        </motion.div>

        <motion.div variants={fadeUp}>
          <TeamSummary
            totalHours={statistics.totalHours}
            uniqueEmployees={statistics.uniqueEmployees}
            uniqueProjects={statistics.uniqueProjects}
            avgHoursPerDay={statistics.avgHoursPerDay}
            entryCount={timesheets?.length ?? 0}
          />
        </motion.div>

        <motion.div variants={fadeUp}>
          <TeamTable
            timesheets={timesheets}
            isLoading={isLoading}
            paginatedEntries={paginatedEntries}
            page={page}
            totalPages={totalPages}
            onPageChange={(p) => {
              const pageNum = typeof p === "function" ? p(page) : p;
              updateParams({ page: pageNum === 1 ? null : String(pageNum) });
            }}
            onEntryClick={handleEntryClick}
            onExportCSV={exportToCSV}
          />
        </motion.div>
      </motion.div>

      <TimeEntryDetailSheet
        entry={selectedEntry}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
    </PageWrapper>
  );
}
