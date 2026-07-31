"use client";

import { useState, useMemo, useCallback } from "react";
import {
  format,
  eachWeekOfInterval,
  startOfYear,
  endOfYear,
  addDays,
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Activity, ChevronLeft, ChevronRight } from "lucide-react";
import { useAttendanceHeatmap } from "@/lib/api/hooks/hr";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const intensityClasses: Record<number, string> = {
  0: "bg-muted/40 dark:bg-muted/20",
  1: "bg-blue-200 dark:bg-blue-900/60",
  2: "bg-blue-400 dark:bg-blue-700",
  3: "bg-blue-600 dark:bg-blue-500",
  4: "bg-blue-800 dark:bg-blue-300",
};

export function AttendanceHeatmap({ userId }: { userId: string }) {
  const [year, setYear] = useState(new Date().getFullYear());

  const { data, isLoading } = useAttendanceHeatmap({ userId, year });

  const handlePrevYear = useCallback(() => setYear((y) => y - 1), []);
  const handleNextYear = useCallback(() => setYear((y) => y + 1), []);

  const { weeks, monthPositions } = useMemo(() => {
    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(new Date(year, 11, 31));

    const heatmapMap = new Map<string, { hours: number; intensity: number }>();
    if (data?.heatmap) {
      for (const d of data.heatmap) {
        heatmapMap.set(d.date, { hours: d.hours, intensity: d.intensity });
      }
    }

    const weekStarts = eachWeekOfInterval({ start: yearStart, end: yearEnd });
    const weeksData = weekStarts.map((weekStart) => {
      return Array.from({ length: 7 }, (_, dayIdx) => {
        const date = addDays(weekStart, dayIdx);
        if (date < yearStart || date > yearEnd) return null;
        const dateStr = format(date, "yyyy-MM-dd");
        const entry = heatmapMap.get(dateStr);
        return {
          date,
          dateStr,
          hours: entry?.hours ?? 0,
          intensity: entry?.intensity ?? 0,
        };
      });
    });

    const positions: { month: number; col: number }[] = [];
    weeksData.forEach((week, colIdx) => {
      const firstValid = week.find((d) => d !== null);
      if (firstValid) {
        const m = firstValid.date.getMonth();
        if (
          positions.length === 0 ||
          positions[positions.length - 1].month !== m
        ) {
          positions.push({ month: m, col: colIdx });
        }
      }
    });

    return { weeks: weeksData, monthPositions: positions };
  }, [year, data]);

  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className="pb-3 pt-5">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
              <Activity className="h-4 w-4 text-blue-500" />
            </div>
            Attendance Heatmap
          </CardTitle>
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/30 p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handlePrevYear}
              aria-label="Previous year"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[50px] text-center text-foreground">
              {year}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleNextYear}
              disabled={year >= new Date().getFullYear()}
              aria-label="Next year"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {data?.summary && (
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">
                {data.summary.totalDays}
              </span>{" "}
              days
            </span>
            <span>
              <span className="font-semibold text-foreground">
                {data.summary.totalHours}h
              </span>{" "}
              worked
            </span>
            <span>
              <span className="font-semibold text-foreground">
                {data.summary.avgHoursPerDay}h
              </span>{" "}
              avg/day
            </span>
            <span>
              <span className="font-semibold text-foreground">
                {data.summary.longestStreak}d
              </span>{" "}
              longest streak
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="pb-5">
        {isLoading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex gap-1">
                {Array.from({ length: 53 }).map((__, j) => (
                  <Skeleton key={j} className="h-3 w-3 rounded-[2px]" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="inline-block min-w-max">
              {/* Month row: same column widths as week grid so labels stay on one baseline */}
              <div className="mb-1.5 flex gap-0.5">
                <div className="mr-1.5 w-8 shrink-0" aria-hidden />
                {weeks.map((_, colIdx) => {
                  const monthStart = monthPositions.find((p) => p.col === colIdx);
                  return (
                    <div
                      key={`mh-${colIdx}`}
                      className="relative h-4 w-3 shrink-0 overflow-visible"
                    >
                      {monthStart ? (
                        <span className="absolute left-0 top-0 z-10 whitespace-nowrap text-[10px] leading-none text-muted-foreground">
                          {MONTH_LABELS[monthStart.month]}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div className="relative">
                <div className="flex gap-0.5">
                  <div className="mr-1.5 flex w-8 shrink-0 flex-col gap-0.5">
                    {DAY_LABELS.map((d, i) => (
                      <div
                        key={d}
                        className={`h-3 text-[10px] leading-3 text-muted-foreground ${i % 2 === 0 ? "invisible" : ""}`}
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                  {weeks.map((week, colIdx) => (
                    <div key={colIdx} className="flex flex-col gap-0.5">
                      {week.map((day, rowIdx) => {
                        if (!day) {
                          return <div key={rowIdx} className="h-3 w-3" />;
                        }
                        const cls =
                          intensityClasses[day.intensity] ??
                          intensityClasses[0];
                        const title =
                          day.hours > 0
                            ? `${format(day.date, "MMM d, yyyy")} — ${day.hours}h`
                            : format(day.date, "MMM d, yyyy");
                        return (
                          <div
                            key={rowIdx}
                            className={`h-3 w-3 rounded-[2px] cursor-default transition-opacity hover:opacity-70 ${cls}`}
                            title={title}
                            role="gridcell"
                            aria-label={title}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-3">
                <span className="text-[10px] text-muted-foreground">Less</span>
                {[0, 1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-3 w-3 rounded-[2px] ${intensityClasses[level]}`}
                  />
                ))}
                <span className="text-[10px] text-muted-foreground">More</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
