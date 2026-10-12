"use client";

import { memo, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ViewMode = "day" | "week" | "month";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

export interface ViewSettingsCardProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  selectedEmployee: string;
  onEmployeeChange: (val: string) => void;
  selectedProject: string;
  onProjectChange: (val: string) => void;
  selectedStatus: string;
  onStatusChange: (val: string) => void;
  employees: { id: string; firstName: string | null; lastName: string | null }[] | undefined;
  projects: { id: number; name: string }[] | undefined;
  calendarMonth: Date;
  onCalendarMonthChange: (date: Date) => void;
  onDateSelect: (date: Date) => void;
}

export const ViewSettingsCard = memo(function ViewSettingsCard({
  viewMode,
  onViewModeChange,
  selectedEmployee,
  onEmployeeChange,
  selectedProject,
  onProjectChange,
  selectedStatus,
  onStatusChange,
  employees,
  projects,
  calendarMonth,
  onCalendarMonthChange,
  onDateSelect,
}: ViewSettingsCardProps) {
  const calendarDays = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  const startDow = getDay(startOfMonth(calendarMonth));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <CalendarDays className="size-4 text-brand-text" aria-hidden="true" />
          View Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-5">
        <Tabs value={viewMode} onValueChange={(v) => onViewModeChange(v as ViewMode)}>
          <TabsList className="w-full">
            {(["day", "week", "month"] as const).map((mode) => (
              <TabsTrigger key={mode} value={mode} className="flex-1 capitalize">
                {mode}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Employee
            </label>
            <Select value={selectedEmployee} onValueChange={onEmployeeChange}>
              <SelectTrigger aria-label="Filter by employee" className="w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {employees?.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </label>
            <Select value={selectedStatus} onValueChange={onStatusChange}>
              <SelectTrigger aria-label="Filter by status" className="w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            Project
          </label>
          <Select value={selectedProject} onValueChange={onProjectChange}>
            <SelectTrigger aria-label="Filter by project" className="w-full">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects?.map((proj) => (
                <SelectItem key={proj.id} value={proj.id.toString()}>
                  {proj.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="pt-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">{format(calendarMonth, "MMMM yyyy")}</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon-xs"
                className="rounded-full"
                onClick={() => onCalendarMonthChange(subMonths(calendarMonth, 1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="size-3.5" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                className="rounded-full"
                onClick={() => onCalendarMonthChange(addMonths(calendarMonth, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_LABELS.map((d, i) => (
              <span key={`${d}-${i}`} className="text-2xs font-semibold text-muted-foreground">
                {d}
              </span>
            ))}
            {Array.from({ length: startDow }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {calendarDays.map((date) => {
              const isTodayDate = isToday(date);
              return (
                <button
                  key={date.getDate()}
                  onClick={() => onDateSelect(date)}
                  className={`flex h-7 items-center justify-center rounded-full text-2xs tabular-nums transition-colors focus-visible:focus-ring ${
                    isTodayDate
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
