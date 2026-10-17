"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneBorder, toneSoft, type Tone } from "@/lib/design/tones";
import { getTodayString } from "@/lib/date-utils";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Ticket {
  id: number;
  title: string;
  status: string;
  type: string;
  priority?: string | null;
  dueDate?: string | null;
  startDate?: string | null;
  ticketNumber?: number;
  sequenceId?: string | null;
}

interface CalendarViewProps {
  tickets: Ticket[];
  onTicketClick: (ticketId: number) => void;
}

const statusTones: Record<string, Tone> = {
  TODO: "neutral",
  IN_PROGRESS: "info",
  IN_REVIEW: "warning",
  DONE: "success",
};

export function CalendarView({ tickets, onTicketClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const ticketsByDate = useMemo(() => {
    const map = new Map<string, Ticket[]>();
    tickets.forEach((t) => {
      const date = t.dueDate || t.startDate;
      if (!date) return;
      const key = typeof date === "string" ? date.split("T")[0] : new Date(date).toISOString().split("T")[0];
      const existing = map.get(key) ?? [];
      existing.push(t);
      map.set(key, existing);
    });
    return map;
  }, [tickets]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = getTodayString();
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Select
            value={String(month)}
            onValueChange={(v) => setCurrentDate(new Date(year, parseInt(v), 1))}
          >
            <SelectTrigger size="sm" className="w-32 font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72 min-w-(--radix-select-trigger-width)">
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(year)}
            onValueChange={(v) => setCurrentDate(new Date(parseInt(v), month, 1))}
          >
            <SelectTrigger
              size="sm"
              className="w-24 font-medium tabular-nums"
              aria-label="Select year"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72 min-w-(--radix-select-trigger-width)">
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)} className="tabular-nums">{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={prevMonth} aria-label="Previous month">
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={nextMonth} aria-label="Next month">
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <div className="grid min-w-[640px] grid-cols-7">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="sticky top-0 z-sticky flex h-9 items-center justify-center border-b border-border bg-surface-sunken text-2xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {day}
            </div>
          ))}
          {days.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="min-h-28 border-b border-r border-border bg-surface-sunken/60" />;
            }

            const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayTickets = ticketsByDate.get(dateKey) ?? [];
            const isToday = dateKey === today;

            return (
              <div
                key={dateKey}
                className={cn(
                  "min-h-28 border-b border-r border-border p-1.5",
                  isToday && "bg-brand-soft/40"
                )}
              >
                <span
                  className={cn(
                    "mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                    isToday ? "bg-primary font-bold text-primary-foreground" : "text-muted-foreground"
                  )}
                >
                  {day}
                </span>
                <div className="flex flex-col gap-0.5">
                  {dayTickets.slice(0, 3).map((t) => {
                    const tone = statusTones[t.status] ?? "neutral";
                    return (
                      <button
                        key={t.id}
                        type="button"
                        title={t.title}
                        onClick={() => onTicketClick(t.id)}
                        className={cn(
                          "truncate rounded-sm border-l-2 px-1.5 py-0.5 text-left text-2xs font-medium transition-opacity hover:opacity-80 focus-visible:focus-ring",
                          toneSoft[tone],
                          toneBorder[tone]
                        )}
                      >
                        {t.title}
                      </button>
                    );
                  })}
                  {dayTickets.length > 3 && (
                    <span className="px-1.5 text-2xs font-medium text-brand-text">+{dayTickets.length - 3} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
