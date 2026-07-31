"use client";

import { useState, useCallback, useMemo, useRef, useEffect, memo } from "react";
import dynamic from "next/dynamic";
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
  startOfDay,
} from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function Plus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function Download({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

const MONTHS = [
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
import { useCalendarEvents } from "@/lib/api/hooks/calendar";
import type { CalendarListItem } from "@/lib/api/hooks/calendar";
import { EventCreateDialog } from "./event-create-dialog";
import { EventDetailSheet } from "./event-detail-sheet";
import type { View, SlotInfo, BigCalEvent } from "./big-calendar-wrapper";

const BigCalendarWrapper = dynamic(
  () =>
    import("./big-calendar-wrapper").then((m) => ({
      default: m.BigCalendarWrapper,
    })),
  { ssr: false },
);

const EVENT_COLORS: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#f59e0b",
  purple: "#a855f7",
  gold: "#bd882c",
};

const RSVP_BORDER_COLORS: Record<string, string> = {
  accepted: "#22c55e",
  declined: "#ef4444",
  tentative: "#f59e0b",
};

const VIEWS: View[] = ["month", "week", "day"];

interface ViewButtonProps {
  v: View;
  current: View;
  onSelect: (v: View) => void;
}

const ViewButton = memo(function ViewButton({
  v,
  current,
  onSelect,
}: ViewButtonProps) {
  const handleClick = useCallback(() => onSelect(v), [v, onSelect]);
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`px-3 text-xs capitalize transition-colors ${
        current === v
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted text-muted-foreground"
      }`}
    >
      {v}
    </button>
  );
});

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>("month");

  const calContainerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(600);
  useEffect(() => {
    const el = calContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const calHeight = Math.max(containerHeight + 200, 900);
  const [createSlot, setCreateSlot] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const rangeStart = useMemo(
    () => startOfMonth(currentDate),
    [currentDate],
  );
  const rangeEnd = useMemo(
    () => endOfMonth(addMonths(currentDate, 1)),
    [currentDate],
  );

  const { data: events = [] } = useCalendarEvents(rangeStart, rangeEnd);

  const selectedEvent = useMemo<CalendarListItem | null>(
    () =>
      selectedEventId !== null
        ? (events.find((e) => e.id === selectedEventId) ?? null)
        : null,
    [selectedEventId, events],
  );

  const calEvents = useMemo(
    () =>
      events.map((e) => ({
        id: e.id,
        title: e.title,
        start: new Date(e.start),
        end: new Date(e.end),
        allDay: e.allDay ?? false,
        resource: {
          color: e.color,
          category: e.category,
          description: e.description,
          location: e.location,
          source: e.source,
          myRsvpStatus: e.myRsvpStatus,
        },
      })),
    [events],
  );

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    setCreateSlot({ start: slotInfo.start, end: slotInfo.end });
    setIsCreateOpen(true);
  }, []);

  const handleOpenCreate = useCallback(() => {
    setCreateSlot(null);
    setIsCreateOpen(true);
  }, []);

  const handleSelectEvent = useCallback((event: BigCalEvent) => {
    setSelectedEventId(String(event.id));
  }, []);

  const eventPropGetter = useCallback((event: BigCalEvent) => {
    const rsvp = event.resource?.myRsvpStatus as string | null | undefined;
    const rsvpBorderColor = rsvp ? (RSVP_BORDER_COLORS[rsvp] ?? null) : null;
    return {
      style: {
        backgroundColor:
          EVENT_COLORS[event.resource?.color ?? "blue"] ?? EVENT_COLORS.blue,
        border: "none",
        borderLeft: rsvpBorderColor ? `4px solid ${rsvpBorderColor}` : "none",
        borderRadius: "4px",
        color: "#fff",
        fontSize: "12px",
        padding: rsvpBorderColor ? "1px 6px 1px 4px" : "1px 6px",
      },
    };
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentDate((d) => {
      if (view === "month") return subMonths(d, 1);
      if (view === "week") return subWeeks(d, 1);
      return subDays(d, 1);
    });
  }, [view]);

  const handleNext = useCallback(() => {
    setCurrentDate((d) => {
      if (view === "month") return addMonths(d, 1);
      if (view === "week") return addWeeks(d, 1);
      return addDays(d, 1);
    });
  }, [view]);

  const handleToday = useCallback(() => setCurrentDate(startOfDay(new Date())), []);

  const handleExport = useCallback(
    (range: "month" | "3months" | "year") => {
      let from: Date;
      let to: Date;
      if (range === "month") {
        from = startOfMonth(currentDate);
        to = endOfMonth(currentDate);
      } else if (range === "3months") {
        from = startOfMonth(currentDate);
        to = endOfMonth(addMonths(currentDate, 2));
      } else {
        from = startOfYear(currentDate);
        to = endOfYear(currentDate);
      }
      const fromStr = format(from, "yyyy-MM-dd");
      const toStr = format(to, "yyyy-MM-dd");
      window.open(
        `/api/calendar/export?from=${fromStr}&to=${toStr}`,
        "_blank",
        "noopener,noreferrer",
      );
    },
    [currentDate],
  );

  const handleExportMonth = useCallback(
    () => handleExport("month"),
    [handleExport],
  );
  const handleExport3Months = useCallback(
    () => handleExport("3months"),
    [handleExport],
  );
  const handleExportYear = useCallback(
    () => handleExport("year"),
    [handleExport],
  );

  const handleCloseDetail = useCallback(() => setSelectedEventId(null), []);

  const calMonth = currentDate.getMonth();
  const calYear = currentDate.getFullYear();
  const yearOptions = useMemo(
    () => Array.from({ length: 11 }, (_, i) => calYear - 5 + i),
    [calYear],
  );

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Previous"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {view === "month" ? (
            <>
              <Select
                value={String(calMonth)}
                onValueChange={(v) =>
                  setCurrentDate(new Date(calYear, parseInt(v), 1))
                }
              >
                <SelectTrigger className="h-9 w-[128px] text-sm font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72 min-w-[var(--radix-select-trigger-width)]">
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i)} className="text-sm py-2.5">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(calYear)}
                onValueChange={(v) =>
                  setCurrentDate(new Date(parseInt(v), calMonth, 1))
                }
              >
                <SelectTrigger
                  className="h-9 min-w-[96px] w-[96px] text-sm font-medium tabular-nums"
                  aria-label="Select year"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72 min-w-[var(--radix-select-trigger-width)]">
                  {yearOptions.map((y) => (
                    <SelectItem
                      key={y}
                      value={String(y)}
                      className="text-sm py-2.5 tabular-nums focus:bg-accent"
                    >
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : (
            <span className="text-sm font-semibold min-w-[140px] text-center">
              {view === "week" &&
                `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d")} – ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d, yyyy")}`}
              {view === "day" && format(currentDate, "EEE, MMM d, yyyy")}
            </span>
          )}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Next"
            onClick={handleNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handleToday}
          >
            Today
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border overflow-hidden h-8">
            {VIEWS.map((v) => (
              <ViewButton key={v} v={v} current={view} onSelect={setView} />
            ))}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                aria-label="Export calendar"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs">
                Export to CSV
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs" onClick={handleExportMonth}>
                This month
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs"
                onClick={handleExport3Months}
              >
                Next 3 months
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs" onClick={handleExportYear}>
                This year
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="h-8 text-xs" onClick={handleOpenCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Event
          </Button>
        </div>
      </div>

      <div
        ref={calContainerRef}
        className={`flex-1 min-h-0 rounded-lg border border-border bg-card calendar-container ${view === "month" ? "overflow-y-scroll" : "overflow-hidden"}`}
      >
        <BigCalendarWrapper
          events={calEvents}
          date={currentDate}
          view={view}
          calHeight={calHeight}
          onView={setView}
          onNavigate={setCurrentDate}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventPropGetter}
        />
      </div>

      <EventCreateDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        defaultSlot={createSlot}
      />

      <EventDetailSheet event={selectedEvent} onClose={handleCloseDetail} />
    </div>
  );
}
