"use client";

import { useState, useCallback } from "react";
import {
  format,
  parseISO,
  isValid,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfQuarter,
  startOfYear,
} from "date-fns";
import { CalendarDays } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateRangePickerProps {
  from?: string;
  to?: string;
  onChange: (range: { from: string; to: string }) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  align?: "start" | "center" | "end";
}

function parseDateStr(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

const PRESETS: { label: string; range: (today: Date) => { from: Date; to: Date } }[] = [
  { label: "Today", range: (t) => ({ from: t, to: t }) },
  { label: "Last 7 days", range: (t) => ({ from: subDays(t, 6), to: t }) },
  { label: "This month", range: (t) => ({ from: startOfMonth(t), to: t }) },
  {
    label: "Last month",
    range: (t) => {
      const m = subMonths(t, 1);
      return { from: startOfMonth(m), to: endOfMonth(m) };
    },
  },
  { label: "This quarter", range: (t) => ({ from: startOfQuarter(t), to: t }) },
  { label: "Year to date", range: (t) => ({ from: startOfYear(t), to: t }) },
];

const fmt = (d: Date) => format(d, "yyyy-MM-dd");

export function DateRangePicker({
  from,
  to,
  onChange,
  placeholder = "Pick a date range",
  disabled = false,
  className,
  align = "start",
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const selectedRange: DateRange | undefined =
    from || to
      ? { from: parseDateStr(from), to: parseDateStr(to) }
      : undefined;

  const handleSelect = useCallback(
    (range: DateRange | undefined) => {
      onChange({
        from: range?.from ? fmt(range.from) : "",
        to: range?.to ? fmt(range.to) : "",
      });
    },
    [onChange],
  );

  const label = (() => {
    const f = parseDateStr(from);
    const t = parseDateStr(to);
    if (f && t) return `${format(f, "MMM d")} – ${format(t, "MMM d, yyyy")}`;
    if (f) return `${format(f, "MMM d, yyyy")} – …`;
    return placeholder;
  })();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-8 justify-start gap-2 border-input bg-card px-3 text-left text-xs font-normal shadow-xs hover:bg-card focus-visible:focus-ring focus-visible:border-ring",
            !from && !to && "text-subtle-foreground",
            className,
          )}
        >
          <CalendarDays className="size-3.5 text-muted-foreground" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <div className="flex flex-col md:flex-row">
          <div
            role="group"
            aria-label="Date range presets"
            className="flex gap-1 overflow-x-auto border-b border-border p-2 md:w-36 md:flex-col md:border-b-0 md:border-r"
          >
            {PRESETS.map((p) => {
              const r = p.range(new Date());
              const active = from === fmt(r.from) && to === fmt(r.to);
              return (
                <Button
                  key={p.label}
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-pressed={active}
                  className={cn(
                    "shrink-0 justify-start font-normal text-muted-foreground",
                    active && "bg-brand-soft text-brand-soft-foreground font-medium hover:bg-brand-soft",
                  )}
                  onClick={() => handleSelect(r)}
                >
                  {p.label}
                </Button>
              );
            })}
          </div>
          <Calendar
            mode="range"
            selected={selectedRange}
            onSelect={handleSelect}
            numberOfMonths={isMobile ? 1 : 2}
            defaultMonth={selectedRange?.from}
            initialFocus
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
