"use client";

import { useState, useMemo, memo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isWeekend, isToday } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useHrMonthlyAttendance, useHrWfhRequests, useHrHolidaysForCalendar } from "@/lib/api/hooks/hr";
import { CalendarDays } from "lucide-react";
import { WEEKDAY_LABELS, CalendarDay, statusConfig } from "./attendance-utils";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const AttendanceCalendar = memo(function AttendanceCalendar({ userId }: { userId: string }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const { data: monthlyLogs, isLoading } = useHrMonthlyAttendance({ userId, year, month });
  const { data: wfhRequests } = useHrWfhRequests();
  const { data: holidaysList } = useHrHolidaysForCalendar({ year, month });

  const calendarDays = useMemo((): CalendarDay[] => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const today = new Date();

    const attendanceMap = new Map<string, string>();
    if (monthlyLogs) {
      for (const log of monthlyLogs) {
        attendanceMap.set(log.date, log.status || "PRESENT");
      }
    }

    const wfhMap = new Set<string>();
    if (wfhRequests) {
      for (const req of wfhRequests) {
        if (req.status === "APPROVED") {
          wfhMap.add(typeof req.date === "string" ? req.date : format(new Date(req.date), "yyyy-MM-dd"));
        }
      }
    }

    const holidayMap = new Map<string, string>();
    if (holidaysList) {
      for (const h of holidaysList) {
        holidayMap.set(h.date, h.name);
      }
    }

    return days.map((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const holidayName = holidayMap.get(dateStr);

      if (holidayName) return { date, status: "holiday", holidayName };

      if (date > today) return { date, status: "future" };
      if (isWeekend(date)) return { date, status: "weekend" };

      if (wfhMap.has(dateStr)) return { date, status: "wfh" };

      const attendanceStatus = attendanceMap.get(dateStr);
      if (attendanceStatus === "PRESENT" || attendanceStatus === "CHECKED_OUT") {
        return { date, status: "present" };
      }

      if (isToday(date)) return { date, status: "none" };

      return { date, status: "absent" };
    });
  }, [currentMonth, monthlyLogs, wfhRequests, holidaysList]);

  const startDayOfWeek = getDay(startOfMonth(currentMonth));
  const paddingDays = Array.from({ length: startDayOfWeek }, (_, i) => i);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);

  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className="sticky top-0 z-10 bg-card pb-3 pt-5 border-b border-border/60">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10">
              <CalendarDays className="h-4 w-4 text-gold" />
            </div>
            Attendance Calendar
          </CardTitle>
          <div className="flex shrink-0 flex-wrap items-stretch gap-2 sm:justify-end">
            <Select
              value={String(month)}
              onValueChange={(v) => setCurrentMonth(new Date(year, parseInt(v, 10), 1))}
            >
              <SelectTrigger
                size="sm"
                className="h-9 w-auto min-w-[10.5rem] max-w-[12rem] border-border text-xs font-medium shadow-xs sm:min-w-[11rem]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="min-w-[var(--radix-select-trigger-width)]">
                {MONTH_NAMES.map((m, i) => (
                  <SelectItem key={m} value={String(i)} className="text-xs">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(year)}
              onValueChange={(v) => setCurrentMonth(new Date(parseInt(v, 10), month, 1))}
            >
              <SelectTrigger
                size="sm"
                className="h-9 w-auto min-w-[5.5rem] border-border text-xs font-medium tabular-nums shadow-xs sm:min-w-[5.75rem]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="min-w-[var(--radix-select-trigger-width)]">
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)} className="text-xs tabular-nums">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-6">
        <div className="max-w-[340px] mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square w-full rounded-md" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAY_LABELS.map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider py-1">
                    {day}
                  </div>
                ))}
                {paddingDays.map((i) => (
                  <div key={`pad-${i}`} className="aspect-square min-w-0 rounded-md" />
                ))}
                {calendarDays.map((day) => {
                  const config = statusConfig[day.status];
                  const dayNum = day.date.getDate();
                  const isTodayDate = isToday(day.date);
                  const isFutureOrNone = day.status === "future" || day.status === "none";
                  const title = day.holidayName
                    ? `${format(day.date, "MMM dd")} – ${day.holidayName}`
                    : `${format(day.date, "MMM dd")}${config.label ? ` – ${config.label}` : ""}`;
                  return (
                    <div
                      key={`${format(day.date, "yyyy-MM-dd")}-${dayNum}`}
                      className={`relative aspect-square flex min-w-0 items-center justify-center rounded-md text-xs font-medium transition-colors ${
                        isFutureOrNone
                          ? "text-muted-foreground/40"
                          : `${config.bg} ${config.text}`
                      } ${isTodayDate ? "ring-2 ring-gold ring-offset-1 ring-offset-background" : ""}`}
                      title={title}
                    >
                      {dayNum}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-4 pt-3 mt-1 border-t border-border" role="list" aria-label="Calendar legend">
                {(["present", "wfh", "leave", "absent", "holiday", "weekend"] as const).map((status) => (
                  <div key={status} className="flex items-center gap-2 text-xs text-muted-foreground" role="listitem">
                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusConfig[status].dot}`} />
                    <span>{statusConfig[status].label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
