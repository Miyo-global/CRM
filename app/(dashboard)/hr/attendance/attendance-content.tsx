"use client";

import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimerCard } from "@/features/hr/attendance/check-in-button";
import { AttendanceCalendar } from "@/features/hr/attendance/attendance-calendar";
import { AttendanceHeatmap } from "@/features/hr/attendance/attendance-heatmap";
import { ManageHolidaysCard } from "@/features/hr/attendance/manage-holidays-card";
import { DailyHistoryTable } from "@/features/hr/attendance/daily-history-table";
import { HolidayWorkRequestCard } from "@/features/hr/attendance/holiday-work-request-card";
import { TeamAttendanceMonitor } from "@/features/hr/attendance/team-attendance-monitor";

function MyAttendancePanels({
  userId,
  isAdmin,
}: {
  userId: string;
  isAdmin: boolean;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pb-6">
      <aside className="lg:col-span-4 xl:col-span-3 space-y-5 lg:sticky lg:top-0 lg:self-start">
        <TimerCard />
        <HolidayWorkRequestCard isAdmin={isAdmin} />
        {isAdmin && <ManageHolidaysCard />}
      </aside>
      <div className="lg:col-span-8 xl:col-span-9 space-y-5 min-w-0">
        <AttendanceCalendar userId={userId} />
        <AttendanceHeatmap userId={userId} />
        <DailyHistoryTable userId={userId} isAdmin={isAdmin} />
      </div>
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

  if (!isAdmin) {
    return (
      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto">
        <MyAttendancePanels userId={userId} isAdmin={false} />
      </div>
    );
  }

  return (
    <Tabs defaultValue="my" className="flex-1 min-h-0 flex flex-col">
      <TabsList className="shrink-0 w-fit">
        <TabsTrigger value="my">My Attendance</TabsTrigger>
        <TabsTrigger value="team">Team Monitor</TabsTrigger>
      </TabsList>

      <TabsContent value="my" className="flex-1 min-h-0 mt-4 overflow-y-auto">
        <MyAttendancePanels userId={userId} isAdmin={isAdmin} />
      </TabsContent>

      <TabsContent value="team" className="flex-1 min-h-0 mt-4 overflow-y-auto">
        <TeamAttendanceMonitor />
      </TabsContent>
    </Tabs>
  );
}
