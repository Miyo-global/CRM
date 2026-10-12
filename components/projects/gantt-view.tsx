"use client";

import { toneVar } from "@/lib/design/tones";
import { useMemo, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";

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
  TODO: toneVar.neutral,
  IN_PROGRESS: toneVar.info,
  IN_REVIEW: toneVar.warning,
  DONE: toneVar.success,
};

const HEADER_H = 40;

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

  const gridWidth = labelWidth + days.length * dayWidth;
  const bodyHeight = Math.max(datedTickets.length * rowHeight, 160);
  const titleMax = labelWidth < 180 ? 12 : 25;

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Select
            value={String(displayMonth)}
            onValueChange={(v) => jumpToMonth(displayYear, parseInt(v))}
          >
            <SelectTrigger size="sm" className="w-32 text-xs">
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
            <SelectTrigger size="sm" className="w-24 text-xs tabular-nums">
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
          <Button variant="ghost" size="icon-sm" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Previous week">
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
            Today
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Next week">
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="relative max-h-[70vh] overflow-auto rounded-lg border border-border bg-card">
        {/* Sticky date header */}
        <svg
          width={gridWidth}
          height={HEADER_H}
          className="sticky top-0 z-sticky block bg-surface-sunken text-foreground"
        >
          <text x={12} y={25} className="fill-muted-foreground" fontSize={11} fontWeight={600}>Work Item</text>
          {days.map((day, i) => {
            const x = labelWidth + i * dayWidth;
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const isToday = localYyyyMmDd(day) === today;
            return (
              <g key={i}>
                {isWeekend && (
                  <rect x={x} y={0} width={dayWidth} height={HEADER_H} className="fill-surface-sunken/60" />
                )}
                <line x1={x} y1={0} x2={x} y2={HEADER_H} className="stroke-border" strokeWidth={0.5} />
                <text x={x + dayWidth / 2} y={16} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </text>
                <text
                  x={x + dayWidth / 2}
                  y={32}
                  textAnchor="middle"
                  className={isToday ? "fill-brand-text tabular-nums" : "fill-muted-foreground tabular-nums"}
                  fontSize={10}
                  fontWeight={isToday ? 700 : 400}
                >
                  {day.getDate()}
                </text>
              </g>
            );
          })}
          <line x1={0} y1={HEADER_H - 0.5} x2={gridWidth} y2={HEADER_H - 0.5} className="stroke-border" />
        </svg>

        <svg width={gridWidth} height={bodyHeight} className="block text-foreground">
          {days.map((day, i) => {
            const x = labelWidth + i * dayWidth;
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const isToday = localYyyyMmDd(day) === today;
            return (
              <g key={i}>
                {isWeekend && (
                  <rect x={x} y={0} width={dayWidth} height={bodyHeight} className="fill-surface-sunken/60" />
                )}
                <line x1={x} y1={0} x2={x} y2={bodyHeight} className="stroke-border" strokeWidth={0.5} />
                {isToday && (
                  <rect x={x + dayWidth / 2} y={0} width={1} height={bodyHeight} className="fill-primary" />
                )}
              </g>
            );
          })}
          <line x1={labelWidth} y1={0} x2={labelWidth} y2={bodyHeight} className="stroke-border" />

          {datedTickets.map((ticket, rowIdx) => {
            const y = rowIdx * rowHeight;
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
              <g key={ticket.id} onClick={() => onTicketClick(ticket.id)} className="group cursor-pointer">
                <rect x={0} y={y} width={gridWidth} height={rowHeight} className="fill-transparent group-hover:fill-accent/60" />
                <line x1={0} y1={y + rowHeight} x2={gridWidth} y2={y + rowHeight} className="stroke-border" strokeWidth={0.5} />
                <text x={12} y={y + rowHeight / 2 + 4} className="fill-foreground" fontSize={labelWidth < 180 ? 10 : 12}>
                  <tspan className="fill-muted-foreground font-mono">{ticket.sequenceId ?? `#${ticket.ticketNumber}`}</tspan>
                  {" "}{ticket.title.slice(0, titleMax)}{ticket.title.length > titleMax ? "…" : ""}
                  <title>{ticket.title}</title>
                </text>
                {startDay <= days.length - 1 && endDay >= 0 && (
                  <rect
                    x={barX}
                    y={y + (rowHeight - 24) / 2}
                    width={barWidth}
                    height={24}
                    rx={6}
                    fill={statusColors[ticket.status] ?? toneVar.neutral}
                    className="transition-opacity group-hover:opacity-90"
                  >
                    <title>{`${ticket.title} · ${ticket.status.replace(/_/g, " ")}`}</title>
                  </rect>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {datedTickets.length === 0 && (
        <EmptyState
          compact
          icon={CalendarRange}
          title="No work items with dates found."
          description="Set start or due dates on tickets, or ensure items have created timestamps so they can appear using those dates."
          className="mx-auto max-w-md border-0 bg-transparent"
        />
      )}
    </div>
  );
}
