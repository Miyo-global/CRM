"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
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

const statusColors: Record<string, string> = {
  TODO: "bg-gray-400",
  IN_PROGRESS: "bg-blue-500",
  IN_REVIEW: "bg-purple-500",
  DONE: "bg-green-500",
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
  const today = new Date().toISOString().split("T")[0];
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <Select
            value={String(month)}
            onValueChange={(v) => setCurrentDate(new Date(year, parseInt(v), 1))}
          >
            <SelectTrigger className="h-9 w-[128px] text-sm font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72 min-w-[var(--radix-select-trigger-width)]">
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i)} className="text-sm py-2.5">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(year)}
            onValueChange={(v) => setCurrentDate(new Date(parseInt(v), month, 1))}
          >
            <SelectTrigger
              className="h-9 min-w-[96px] w-[96px] text-sm font-medium tabular-nums"
              aria-label="Select year"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72 min-w-[var(--radix-select-trigger-width)]">
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)} className="text-sm py-2.5 tabular-nums focus:bg-accent">{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border rounded-lg overflow-hidden">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="px-2 py-1.5 text-xs font-medium text-muted-foreground text-center bg-muted/50 border-b sticky top-0 z-10">
            {day}
          </div>
        ))}
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="min-h-[100px] border-b border-r bg-muted/20" />;
          }

          const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayTickets = ticketsByDate.get(dateKey) ?? [];
          const isToday = dateKey === today;

          return (
            <div
              key={dateKey}
              className={cn(
                "min-h-[100px] border-b border-r p-1",
                isToday ? "bg-primary/5" : "bg-background"
              )}
            >
              <span
                className={cn(
                  "inline-flex items-center justify-center h-6 w-6 text-xs rounded-full mb-1",
                  isToday ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"
                )}
              >
                {day}
              </span>
              <div className="flex flex-col gap-0.5">
                {dayTickets.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onTicketClick(t.id)}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-left hover:bg-muted transition-colors"
                  >
                    <div className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", statusColors[t.status] ?? "bg-gray-400")} />
                    <span className="text-[10px] text-foreground truncate">{t.title}</span>
                  </button>
                ))}
                {dayTickets.length > 3 && (
                  <span className="text-[10px] text-muted-foreground px-1.5">+{dayTickets.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
