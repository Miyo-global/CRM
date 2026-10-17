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
import { ChevronLeft, ChevronRight } from "lucide-react";
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

/** Gold heat scale (§8.8): zero = muted, then 4 gold buckets 100→700. */
const intensityClasses: Record<number, string> = {
  0: "bg-muted",
  1: "bg-gold-100",
  2: "bg-gold-300",
  3: "bg-gold-500",
  4: "bg-gold-700",
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
    <Card className="gap-0 overflow-hidden">
      <CardHeader className="pb-3 pt-5">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            Attendance Heatmap
          </CardTitle>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handlePrevYear}
              aria-label="Previous year"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            <span className="min-w-12 text-center text-sm font-medium tabular-nums text-foreground" aria-live="polite">
              {year}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleNextYear}
              disabled={year >= new Date().getFullYear()}
              aria-label="Next year"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
        {data?.summary && (
          <div className="mt-2 flex flex-wrap gap-4 text-xs tabular-nums text-muted-foreground">
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
                  <Skeleton key={j} className="h-3 w-3 rounded-xs" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div
              className="inline-block min-w-max"
              role="img"
              aria-label={
                data?.summary
                  ? `Attendance heatmap for ${year}: ${data.summary.totalDays} days, ${data.summary.totalHours} hours worked`
                  : `Attendance heatmap for ${year}`
              }
            >
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
                        <span className="absolute left-0 top-0 z-10 whitespace-nowrap text-2xs leading-none text-muted-foreground">
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
                        className={`h-3 text-2xs leading-3 text-muted-foreground ${i % 2 === 0 ? "invisible" : ""}`}
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
                            className={`size-3 cursor-default rounded-xs ring-ring transition-shadow hover:ring-1 ${cls}`}
                            title={title}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-3">
                <span className="text-2xs text-muted-foreground">Less</span>
                {[0, 1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`size-3 rounded-xs ${intensityClasses[level]}`}
                    aria-hidden="true"
                  />
                ))}
                <span className="text-2xs text-muted-foreground">More</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
