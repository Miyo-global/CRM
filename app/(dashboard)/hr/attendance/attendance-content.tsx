"use client";

import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimerCard } from "@/features/hr/attendance/check-in-button";
import { AttendanceCalendar } from "@/features/hr/attendance/attendance-calendar";
import { AttendanceHeatmap } from "@/features/hr/attendance/attendance-heatmap";
import { DailyHistoryTable } from "@/features/hr/attendance/daily-history-table";
import { HolidayWorkRequestCard } from "@/features/hr/attendance/holiday-work-request-card";
import { TeamAttendanceMonitor } from "@/features/hr/attendance/team-attendance-monitor";
import { useHrLeaveContext } from "@/lib/api/hooks/hr";

/**
 * Two zones only: the time tracker, then the month calendar (B7). The heatmap
 * and the day-by-day log live under History, and holidays are managed on the
 * Holidays page rather than duplicated here (A39).
 */
function MyAttendancePanels({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const { data: leaveContext } = useHrLeaveContext();

  return (
    <div className="space-y-5 pb-6">
      <TimerCard />
      <AttendanceCalendar userId={userId} joiningDate={leaveContext?.joiningDate ?? null} />
      <HolidayWorkRequestCard isAdmin={isAdmin} />
    </div>
  );
}

export function AttendanceContent({ userId, isAdmin = false }: { userId: string; isAdmin?: boolean }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (hash !== "holiday-work") return;
    const t = window.setTimeout(() => {
      document.getElementById("holiday-work")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <Tabs defaultValue="my" className="flex-1 min-h-0 flex flex-col">
      <TabsList variant="underline" className="shrink-0">
        <TabsTrigger value="my">My attendance</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
        {isAdmin && <TabsTrigger value="team">Team monitor</TabsTrigger>}
      </TabsList>

      <TabsContent value="my" className="flex-1 min-h-0 mt-4 overflow-y-auto">
        <MyAttendancePanels userId={userId} isAdmin={isAdmin} />
      </TabsContent>

      <TabsContent value="history" className="flex-1 min-h-0 mt-4 overflow-y-auto">
        <div className="space-y-5 pb-6">
          <AttendanceHeatmap userId={userId} />
          <DailyHistoryTable userId={userId} isAdmin={isAdmin} />
        </div>
      </TabsContent>

      {isAdmin && (
        <TabsContent value="team" className="flex-1 min-h-0 mt-4 overflow-y-auto">
          <TeamAttendanceMonitor />
        </TabsContent>
      )}
    </Tabs>
  );
}
