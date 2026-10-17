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

import { WEEKDAY_LABELS, CalendarDay, statusConfig } from "./attendance-utils";
import { useHrMyLeaves } from "@/lib/api/hooks/hr/leaves-expenses";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const AttendanceCalendar = memo(function AttendanceCalendar({
  userId,
  joiningDate,
}: {
  userId: string;
  /** Days before this are not employed days, so they are blank (A37). */
  joiningDate?: string | null;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const { data: monthlyLogs, isLoading } = useHrMonthlyAttendance({ userId, year, month });
  const { data: wfhRequests } = useHrWfhRequests();
  const { data: holidaysList } = useHrHolidaysForCalendar({ year, month });
  // Approved leave was never marked, so a day off read as absent (QA-0066).
  const { data: myLeaves } = useHrMyLeaves();

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

    const approvedLeaveDates = new Set<string>();
    for (const raw of (myLeaves?.requests ?? []) as Array<{
      status?: string | null;
      startDate?: string | null;
      endDate?: string | null;
    }>) {
      if (raw.status !== "APPROVED" || !raw.startDate || !raw.endDate) continue;
      const from = new Date(`${String(raw.startDate).slice(0, 10)}T00:00:00`);
      const to = new Date(`${String(raw.endDate).slice(0, 10)}T00:00:00`);
      for (const day of eachDayOfInterval({ start: from, end: to })) {
        approvedLeaveDates.add(format(day, "yyyy-MM-dd"));
      }
    }

    const holidayMap = new Map<string, string>();
    if (holidaysList) {
      for (const h of holidaysList) {
        holidayMap.set(h.date, h.name);
      }
    }

    const joined = joiningDate?.slice(0, 10);

    return days.map((date) => {
      const dateStr = format(date, "yyyy-MM-dd");

      // Not employed yet: neither present nor absent (A37).
      if (joined && dateStr < joined) return { date, status: "notEmployed" };

      const holidayName = holidayMap.get(dateStr);

      if (holidayName) return { date, status: "holiday", holidayName };

      // Approved leave is marked whether it is past or still to come.
      if (approvedLeaveDates.has(dateStr)) return { date, status: "leave" };

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
  }, [currentMonth, monthlyLogs, wfhRequests, holidaysList, joiningDate, myLeaves]);

  const startDayOfWeek = getDay(startOfMonth(currentMonth));
  const paddingDays = Array.from({ length: startDayOfWeek }, (_, i) => i);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);

  return (
    <Card className="gap-0 overflow-hidden">
      <CardHeader className="border-b border-border bg-card pb-3 pt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            Attendance Calendar
          </CardTitle>
          <div className="flex shrink-0 flex-wrap items-stretch gap-2 sm:justify-end">
            <Select
              value={String(month)}
              onValueChange={(v) => setCurrentMonth(new Date(year, parseInt(v, 10), 1))}
            >
              <SelectTrigger
                size="sm"
                aria-label="Month"
                className="h-9 w-40"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="min-w-[var(--radix-select-trigger-width)]">
                {MONTH_NAMES.map((m, i) => (
                  <SelectItem key={m} value={String(i)}>
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
                aria-label="Year"
                className="h-9 w-24 tabular-nums"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="min-w-[var(--radix-select-trigger-width)]">
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)} className="tabular-nums">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 py-5">
        <div className="mx-auto max-w-sm">
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
                  <div key={day} className="py-1 text-center text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                  const isFutureOrNone =
                    day.status === "future" ||
                    day.status === "none" ||
                    day.status === "notEmployed";
                  const title = day.holidayName
                    ? `${format(day.date, "MMM dd")} – ${day.holidayName}`
                    : `${format(day.date, "MMM dd")}${config.label ? ` – ${config.label}` : ""}`;
                  return (
                    <div
                      key={`${format(day.date, "yyyy-MM-dd")}-${dayNum}`}
                      className={`relative flex aspect-square min-w-0 items-center justify-center rounded-md text-xs font-medium tabular-nums transition-colors ${
                        isFutureOrNone
                          ? "text-subtle-foreground"
                          : `${config.bg} ${config.text}`
                      } ${isTodayDate ? "ring-2 ring-gold-400 ring-offset-1 ring-offset-card" : ""}`}
                      title={title}
                      aria-current={isTodayDate ? "date" : undefined}
                    >
                      {day.status === "notEmployed" ? "" : dayNum}
                      {day.status === "absent" && (
                        <span
                          className={`absolute bottom-1 size-1.5 rounded-full ${statusConfig.absent.dot}`}
                          aria-hidden="true"
                        />
                      )}
                      {!isFutureOrNone && config.label ? <span className="sr-only">{`, ${config.label}`}</span> : null}
                    </div>
                  );
                })}
              </div>

              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-3" role="list" aria-label="Calendar legend">
                {(["present", "wfh", "leave", "absent", "holiday", "weekend"] as const).map((status) => (
                  <div key={status} className="flex items-center gap-2 text-xs text-muted-foreground" role="listitem">
                    <div className={`size-2 shrink-0 rounded-full ${statusConfig[status].dot}`} aria-hidden="true" />
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
