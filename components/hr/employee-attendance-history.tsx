"use client";

import { useMemo, useState } from "react";
import { useHrAttendanceSummary } from "@/lib/api/hooks/hr";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { isPresentAttendanceStatus } from "@/lib/hr/attendance-summary";
import type { AttendanceSummaryPeriod } from "@/types/hr";

export function EmployeeAttendanceHistory({ userId }: { userId: string }) {
  const [date, setDate] = useState(new Date());
  const [period, setPeriod] = useState<AttendanceSummaryPeriod>("month");
  const [quarter, setQuarter] = useState(() => Math.floor(new Date().getMonth() / 3) + 1);

  const summaryParams = useMemo(
    () => ({
      userId,
      period,
      year: date.getFullYear(),
      ...(period === "month" ? { month: date.getMonth() } : {}),
      ...(period === "quarter" ? { quarter } : {}),
    }),
    [userId, period, date, quarter],
  );

  const { data, isLoading } = useHrAttendanceSummary(summaryParams);

  const summary = data?.summary;
  const attendance = data?.logs;

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  function handleMonthChange(val: string) {
    const newDate = new Date(date);
    newDate.setMonth(parseInt(val, 10));
    setDate(newDate);
  }

  function handleYearChange(val: string) {
    const newDate = new Date(date);
    newDate.setFullYear(parseInt(val, 10));
    setDate(newDate);
  }

  function handleQuarterChange(val: string) {
    setQuarter(parseInt(val, 10));
  }

  const emptyMessage =
    period === "month"
      ? "No attendance records found for this month."
      : period === "quarter"
        ? "No attendance records found for this quarter."
        : "No attendance records found for this year.";

  return (
    <div className="space-y-3">
      <Tabs
        value={period}
        onValueChange={(v) => setPeriod(v as AttendanceSummaryPeriod)}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="quarter">Quarter</TabsTrigger>
          <TabsTrigger value="year">Year</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-3">
        {period === "month" && (
          <Select value={date.getMonth().toString()} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m, i) => (
                <SelectItem key={i} value={i.toString()}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {period === "quarter" && (
          <Select value={quarter.toString()} onValueChange={handleQuarterChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Quarter" />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((q) => (
                <SelectItem key={q} value={q.toString()}>
                  Q{q}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={date.getFullYear().toString()} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {summary && (
        <p className="text-sm text-muted-foreground">
          {summary.label} · {summary.rangeStart} → {summary.rangeEnd}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Attendance rate</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold">
              {summary ? `${summary.attendanceRatePct}%` : ""}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Present weekdays vs elapsed weekdays (Mon–Fri, capped at today)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Present / elapsed weekdays</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold">
              {summary ? `${summary.presentWeekdays} / ${summary.weekdaysElapsed}` : ""}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary ? `${summary.weekdaysInPeriod} working days in full period` : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total hours</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold">
              {summary ? `${summary.totalWorkHours.toFixed(1)}h` : ""}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg hours / weekday (elapsed)</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold">
              {summary ? `${summary.avgHoursPerWeekdayElapsed.toFixed(1)}h` : ""}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg hours / present day</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold">
              {summary ? `${summary.avgHoursPerPresentDay.toFixed(1)}h` : ""}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Days with logs</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold">{summary ? summary.loggedDays : ""}</div>
            <p className="mt-1 text-xs text-muted-foreground">Distinct dates with time entries</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Daily attendance</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="max-h-[480px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Work Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance?.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(new Date(record.date + "T12:00:00"), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            isPresentAttendanceStatus(record.status) ? "default" : "secondary"
                          }
                        >
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.checkIn ? format(new Date(record.checkIn), "hh:mm a") : "-"}
                      </TableCell>
                      <TableCell>
                        {record.checkOut ? format(new Date(record.checkOut), "hh:mm a") : "-"}
                      </TableCell>
                      <TableCell className="font-bold">{record.workHours}h</TableCell>
                    </TableRow>
                  ))}
                  {!attendance?.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-4 text-center text-muted-foreground">
                        {emptyMessage}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
