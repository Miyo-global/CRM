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
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          View Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-5">
        <div className="flex p-1 bg-muted rounded-lg">
          {(["day", "week", "month"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all capitalize ${
                viewMode === mode
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Employee
            </label>
            <Select value={selectedEmployee} onValueChange={onEmployeeChange}>
              <SelectTrigger aria-label="Filter by employee" className="h-8 text-xs">
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
            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Status
            </label>
            <Select value={selectedStatus} onValueChange={onStatusChange}>
              <SelectTrigger aria-label="Filter by status" className="h-8 text-xs">
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
          <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            Project
          </label>
          <Select value={selectedProject} onValueChange={onProjectChange}>
            <SelectTrigger aria-label="Filter by project" className="h-8 text-xs">
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
            <span className="text-sm font-bold">{format(calendarMonth, "MMMM yyyy")}</span>
            <div className="flex gap-1">
              <button
                onClick={() => onCalendarMonthChange(subMonths(calendarMonth, 1))}
                className="size-6 flex items-center justify-center hover:bg-muted rounded-full transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onCalendarMonthChange(addMonths(calendarMonth, 1))}
                className="size-6 flex items-center justify-center hover:bg-muted rounded-full transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_LABELS.map((d, i) => (
              <span key={`${d}-${i}`} className="text-[10px] font-bold text-muted-foreground">
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
                  className={`h-6 text-[10px] flex items-center justify-center rounded-full transition-colors ${
                    isTodayDate
                      ? "bg-primary text-white font-bold"
                      : "hover:bg-primary/10"
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
