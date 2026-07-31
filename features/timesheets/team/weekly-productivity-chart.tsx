"use client";

import { memo, useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatHoursMinutes } from "@/lib/format-utils";
import type { TimeEntryWithUser } from "@/types/projects";

type TimesheetEntry = TimeEntryWithUser;

export interface WeeklyProductivityChartProps {
  timesheets: TimesheetEntry[] | undefined;
  totalHours: number;
  prevWeekHours: number;
}

export const WeeklyProductivityChart = memo(function WeeklyProductivityChart({
  timesheets,
  totalHours,
  prevWeekHours,
}: WeeklyProductivityChartProps) {
  const dailyHours = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dayMap = new Map<string, number>();
    days.forEach((d) => dayMap.set(d, 0));

    if (timesheets) {
      timesheets.forEach((entry) => {
        const dayName = format(new Date(entry.date), "EEE");
        const shortDay = dayName.slice(0, 3);
        if (dayMap.has(shortDay)) {
          dayMap.set(shortDay, (dayMap.get(shortDay) || 0) + parseFloat(entry.hours || "0"));
        }
      });
    }

    const maxHours = Math.max(...Array.from(dayMap.values()), 1);
    return days.map((day) => ({
      label: day,
      hours: dayMap.get(day) || 0,
      percent: Math.round(((dayMap.get(day) || 0) / maxHours) * 100),
    }));
  }, [timesheets]);

  const percentChange =
    prevWeekHours > 0
      ? (((totalHours - prevWeekHours) / prevWeekHours) * 100).toFixed(1)
      : null;

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base font-bold">Weekly Productivity Summary</CardTitle>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-2xl font-black tracking-tight">
                {formatHoursMinutes(totalHours)}
              </span>
              {percentChange !== null && (
                <Badge
                  variant="secondary"
                  className={`text-xs font-semibold ${
                    parseFloat(percentChange) >= 0
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
                  }`}
                >
                  {parseFloat(percentChange) >= 0 ? "+" : ""}
                  {percentChange}% vs last week
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between h-48 px-2 gap-3 mt-2">
          {dailyHours.map((day) => (
            <div key={day.label} className="flex flex-col items-center flex-1 gap-2 group">
              <div className="w-full bg-muted rounded-t relative h-40">
                <div
                  className="absolute bottom-0 w-full bg-primary/30 group-hover:bg-primary transition-all duration-200 rounded-t"
                  style={{ height: `${Math.max(day.percent, 2)}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {day.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
