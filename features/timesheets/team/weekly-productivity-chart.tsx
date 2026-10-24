"use client";

import { memo, useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { formatHoursMinutes } from "@/lib/format-utils";
import type { TimeEntryWithUser } from "@/types/projects";
import { parseCalendarDate } from "@/lib/date-utils";

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
        const dayName = format(parseCalendarDate(entry.date), "EEE");
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
            <CardTitle className="text-lg font-semibold">Weekly Productivity Summary</CardTitle>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="font-display text-3xl font-extrabold tabular-nums">
                {formatHoursMinutes(totalHours)}
              </span>
              {percentChange !== null && (
                <StatusPill
                  tone={parseFloat(percentChange) >= 0 ? "success" : "danger"}
                  className="tabular-nums"
                >
                  {parseFloat(percentChange) >= 0 ? "+" : ""}
                  {percentChange}% vs last week
                </StatusPill>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          role="img"
          aria-label={`Hours per day: ${dailyHours.map((d) => `${d.label} ${d.hours.toFixed(1)}h`).join(", ")}`}
          className="mt-2 flex h-48 items-end justify-between gap-2 px-1 sm:gap-3 sm:px-2"
        >
          {dailyHours.map((day) => (
            <div key={day.label} className="flex flex-col items-center flex-1 gap-2 group">
              <div className="relative h-40 w-full rounded-t-sm bg-muted" title={`${day.hours.toFixed(1)}h`}>
                <div
                  className="absolute bottom-0 w-full rounded-t-sm bg-gold-400/40 transition-colors duration-200 group-hover:bg-gold-400 motion-reduce:transition-none"
                  style={{ height: `${Math.max(day.percent, 2)}%` }}
                />
              </div>
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                {day.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
