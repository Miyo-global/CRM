"use client";

import { useState, useCallback, useMemo, useRef, useEffect, type CSSProperties } from "react";
import { toneVar } from "@/lib/design/tones";
import { RSVP_TONES, eventColorTone, eventToneStyle } from "./event-tones";
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
  endOfDay,
  addHours,
} from "date-fns";
import { isDateOnly, parseCalendarDate } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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


const VIEWS: View[] = ["month", "week", "day", "agenda"];
const VIEW_LABELS: Partial<Record<View, string>> = { agenda: "List" };
/** Under 768px month chips shrink to ~14px and overlap, so phones open the list (QA-RESP-03). */
const NARROW_QUERY = "(max-width: 767px)";

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>("month");

  useEffect(() => {
    const mq = window.matchMedia(NARROW_QUERY);
    const apply = () => setView((v) => (mq.matches ? "agenda" : v === "agenda" ? "month" : v));
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

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

  // Match the viewport instead of forcing 900px plus padding, which made the
  // month rows far taller than their content (QA-D007).
  const calHeight = Math.max(containerHeight, 560);
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
        // Leaves/holidays arrive as bare days; read them as local days and end
        // them at end of day (react-big-calendar treats midnight as exclusive).
        start: parseCalendarDate(e.start),
        end: isDateOnly(e.end) ? endOfDay(parseCalendarDate(e.end)) : new Date(e.end),
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
    // In Day view the toolbar button adds to the day on screen, at the current time.
    if (view === "day") {
      const now = new Date();
      const start = new Date(currentDate);
      start.setHours(now.getHours(), now.getMinutes(), 0, 0);
      setCreateSlot({ start, end: addHours(start, 1) });
    } else {
      setCreateSlot(null);
    }
    setIsCreateOpen(true);
  }, [view, currentDate]);

  const handleSelectEvent = useCallback((event: BigCalEvent) => {
    setSelectedEventId(String(event.id));
  }, []);

  const eventPropGetter = useCallback((event: BigCalEvent) => {
    const rsvp = event.resource?.myRsvpStatus as string | null | undefined;
    const rsvpTone = rsvp ? RSVP_TONES[rsvp] : undefined;
    return {
      style: {
        ...eventToneStyle(eventColorTone(event.resource?.color)),
        ...(rsvpTone ? { "--event-tone": toneVar[rsvpTone], borderLeftWidth: 4 } : {}),
      } as CSSProperties,
    };
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentDate((d) => {
      if (view === "month" || view === "agenda") return subMonths(d, 1);
      if (view === "week") return subWeeks(d, 1);
      return subDays(d, 1);
    });
  }, [view]);

  const handleNext = useCallback(() => {
    setCurrentDate((d) => {
      if (view === "month" || view === "agenda") return addMonths(d, 1);
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
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <div className="flex items-center">
            <Button variant="ghost" size="icon-sm" aria-label="Previous" onClick={handlePrev}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Next" onClick={handleNext}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          {view === "month" || view === "agenda" ? (
            <h2 className="flex items-center">
              <Select
                value={String(calMonth)}
                onValueChange={(v) =>
                  setCurrentDate(new Date(calYear, parseInt(v), 1))
                }
              >
                <SelectTrigger
                  aria-label="Select month"
                  className="h-9 w-auto gap-1 border-0 bg-transparent px-1.5 font-display text-xl font-bold shadow-none hover:bg-accent"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72 min-w-(--radix-select-trigger-width)">
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i)} className="py-2.5 text-sm">
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
                  className="h-9 w-auto gap-1 border-0 bg-transparent px-1.5 font-display text-xl font-bold tabular-nums shadow-none hover:bg-accent"
                  aria-label="Select year"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72 min-w-(--radix-select-trigger-width)">
                  {yearOptions.map((y) => (
                    <SelectItem
                      key={y}
                      value={String(y)}
                      className="py-2.5 text-sm tabular-nums"
                    >
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </h2>
          ) : (
            <h2 className="px-1.5 font-display text-xl font-bold tabular-nums text-foreground">
              {view === "week" &&
                `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d")} – ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d, yyyy")}`}
              {view === "day" && format(currentDate, "EEE, MMM d, yyyy")}
            </h2>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList aria-label="Calendar view">
              {VIEWS.map((v) => (
                <TabsTrigger key={v} value={v} className="capitalize">
                  {VIEW_LABELS[v] ?? v}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" aria-label="Export calendar">
                <Download className="size-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs">
                Export to CSV
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportMonth}>
                This month
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport3Months}>
                Next 3 months
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportYear}>
                This year
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="size-4" />
            Add Event
          </Button>
        </div>
      </div>

      <div
        ref={calContainerRef}
        className={`flex-1 min-h-0 rounded-lg border border-border bg-card calendar-container ${view === "month" || view === "agenda" ? "overflow-y-auto" : "overflow-hidden"}`}
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
