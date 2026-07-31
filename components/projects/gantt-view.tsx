"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MS_PER_DAY = 86400000;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function localYyyyMmDd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function coerceCalendarDay(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const t = Date.parse(s);
    if (Number.isNaN(t)) return null;
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) return null;
    return localYyyyMmDd(d);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return localYyyyMmDd(d);
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return localYyyyMmDd(value);
  }
  return null;
}

function localMidnightFromDay(day: string): Date {
  const c = coerceCalendarDay(day);
  if (!c) return new Date(NaN);
  const [y, m, d] = c.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  return dt;
}

interface Ticket {
  id: number;
  title: string;
  status: string;
  type: string;
  startDate?: string | null;
  dueDate?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  ticketNumber?: number;
  sequenceId?: string | null;
  assignee?: { id: string; firstName?: string | null; lastName?: string | null } | null;
}

interface GanttViewProps {
  tickets: Ticket[];
  onTicketClick: (ticketId: number) => void;
}

const statusColors: Record<string, string> = {
  TODO: "#9ca3af",
  IN_PROGRESS: "#3b82f6",
  IN_REVIEW: "#8b5cf6",
  DONE: "#22c55e",
};

export function GanttView({ tickets, onTicketClick }: GanttViewProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const didAutoFitViewport = useRef(false);

  const datedTickets = useMemo(() => {
    const normalized = tickets.map((t) => {
      let start = coerceCalendarDay(t.startDate);
      let due = coerceCalendarDay(t.dueDate);
      if (!start && !due) {
        const fallback =
          coerceCalendarDay(t.createdAt) ?? coerceCalendarDay(t.updatedAt);
        if (fallback) {
          start = fallback;
          due = fallback;
        }
      }
      if (start && !due) due = start;
      if (!start && due) start = due;
      if (!start || !due) return null;
      const startDt = localMidnightFromDay(start);
      const dueDt = localMidnightFromDay(due);
      if (
        Number.isNaN(startDt.getTime()) ||
        Number.isNaN(dueDt.getTime())
      ) {
        return null;
      }
      return { ...t, startDate: start, dueDate: due };
    });
    return normalized.filter(
      (row): row is Ticket & { startDate: string; dueDate: string } => row != null
    );
  }, [tickets]);

  const startOfWeek = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + weekOffset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [weekOffset]);

  const [viewportWidth, setViewportWidth] = useState(1280);
  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const numDays = viewportWidth < 640 ? 14 : viewportWidth < 1024 ? 21 : 28;
  const dayWidth = viewportWidth < 640 ? 28 : viewportWidth < 1024 ? 34 : 40;
  const rowHeight = 36;
  const labelWidth = viewportWidth < 640 ? 120 : viewportWidth < 1024 ? 180 : 240;

  useEffect(() => {
    if (didAutoFitViewport.current || datedTickets.length === 0) return;

    const viewStart = startOfWeek.getTime();
    const viewEnd = viewStart + (numDays - 1) * MS_PER_DAY;

    let anyOverlap = false;
    for (const t of datedTickets) {
      const s = localMidnightFromDay(t.startDate).getTime();
      const e = localMidnightFromDay(t.dueDate).getTime();
      if (Number.isNaN(s) || Number.isNaN(e)) continue;
      if (e >= viewStart && s <= viewEnd + MS_PER_DAY - 1) {
        anyOverlap = true;
        break;
      }
    }

    if (!anyOverlap) {
      let minTime = Infinity;
      for (const t of datedTickets) {
        const s = localMidnightFromDay(t.startDate).getTime();
        if (Number.isFinite(s)) minTime = Math.min(minTime, s);
      }
      if (Number.isFinite(minTime)) {
        const anchor = new Date(minTime);
        const now = new Date();
        now.setDate(now.getDate() - now.getDay());
        now.setHours(0, 0, 0, 0);
        const targetWeek = new Date(anchor);
        targetWeek.setDate(targetWeek.getDate() - targetWeek.getDay());
        targetWeek.setHours(0, 0, 0, 0);
        const diffWeeks = Math.round(
          (targetWeek.getTime() - now.getTime()) / (7 * MS_PER_DAY)
        );
        setWeekOffset(diffWeeks);
      }
    }
    didAutoFitViewport.current = true;
  }, [datedTickets, numDays, startOfWeek]);

  const days = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < numDays; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [startOfWeek, numDays]);

  const today = localYyyyMmDd(new Date());

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const jumpToMonth = (year: number, month: number) => {
    const target = new Date(year, month, 1);
    const now = new Date();
    now.setDate(now.getDate() - now.getDay());
    now.setHours(0, 0, 0, 0);
    const diff = Math.round((target.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000));
    setWeekOffset(diff);
  };

  const displayDate = startOfWeek;
  const displayMonth = displayDate.getMonth();
  const displayYear = displayDate.getFullYear();

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <Select
            value={String(displayMonth)}
            onValueChange={(v) => jumpToMonth(displayYear, parseInt(v))}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i)} className="text-xs">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(displayYear)}
            onValueChange={(v) => jumpToMonth(parseInt(v), displayMonth)}
          >
            <SelectTrigger className="h-8 w-[80px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setWeekOffset(0)}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="w-full border rounded-lg" type="auto">
        <svg
          width={labelWidth + days.length * dayWidth}
          height={Math.max(datedTickets.length * rowHeight + 40, 200)}
          className="text-foreground"
        >
          <rect x={0} y={0} width={labelWidth} height={40} className="fill-muted/50" />
          <text x={12} y={26} className="fill-muted-foreground text-xs" fontSize={12}>Work Item</text>

          {days.map((day, i) => {
            const x = labelWidth + i * dayWidth;
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const isToday = localYyyyMmDd(day) === today;
            return (
              <g key={i}>
                {isWeekend && (
                  <rect
                    x={x}
                    y={40}
                    width={dayWidth}
                    height={datedTickets.length * rowHeight}
                    className="fill-muted/30"
                  />
                )}
                {isToday && (
                  <rect
                    x={x}
                    y={40}
                    width={dayWidth}
                    height={datedTickets.length * rowHeight}
                    className="fill-primary/10"
                  />
                )}
                <line x1={x} y1={0} x2={x} y2={datedTickets.length * rowHeight + 40} className="stroke-border" strokeWidth={0.5} />
                <text x={x + dayWidth / 2} y={16} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </text>
                <text x={x + dayWidth / 2} y={32} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>
                  {day.getDate()}
                </text>
              </g>
            );
          })}

          <line x1={labelWidth} y1={40} x2={labelWidth + days.length * dayWidth} y2={40} className="stroke-border" />

          {datedTickets.map((ticket, rowIdx) => {
            const y = 40 + rowIdx * rowHeight;
            const start = localMidnightFromDay(ticket.startDate);
            const end = localMidnightFromDay(ticket.dueDate);

            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

            const startDay = Math.max(
              0,
              Math.floor((start.getTime() - startOfWeek.getTime()) / MS_PER_DAY)
            );
            const endDay = Math.min(
              days.length - 1,
              Math.floor((end.getTime() - startOfWeek.getTime()) / MS_PER_DAY)
            );

            const barX = labelWidth + startDay * dayWidth + 2;
            const barWidth = Math.max(dayWidth - 4, (endDay - startDay + 1) * dayWidth - 4);

            return (
              <g key={ticket.id} onClick={() => onTicketClick(ticket.id)} className="cursor-pointer">
                <line x1={0} y1={y} x2={labelWidth + days.length * dayWidth} y2={y} className="stroke-border" strokeWidth={0.5} />
                <text x={8} y={y + rowHeight / 2 + 4} className="fill-foreground" fontSize={labelWidth < 180 ? 9 : 11}>
                  {(ticket.sequenceId ?? `#${ticket.ticketNumber}`)} {ticket.title.slice(0, labelWidth < 180 ? 12 : 25)}{ticket.title.length > (labelWidth < 180 ? 12 : 25) ? "…" : ""}
                </text>
                {startDay <= days.length - 1 && endDay >= 0 && (
                  <rect
                    x={barX}
                    y={y + 6}
                    width={barWidth}
                    height={rowHeight - 12}
                    rx={4}
                    fill={statusColors[ticket.status] ?? "#9ca3af"}
                    opacity={0.8}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </ScrollArea>

      {datedTickets.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm max-w-md mx-auto space-y-1">
          <p>No work items with dates found.</p>
          <p className="text-xs">
            Set start or due dates on tickets, or ensure items have created timestamps so they can appear using those dates.
          </p>
        </div>
      )}
    </div>
  );
}
