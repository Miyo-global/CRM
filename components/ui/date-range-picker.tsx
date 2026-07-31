"use client";

import { useState, useCallback } from "react";
import { format, parseISO, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
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

  const selectedRange: DateRange | undefined =
    from || to
      ? { from: parseDateStr(from), to: parseDateStr(to) }
      : undefined;

  const handleSelect = useCallback(
    (range: DateRange | undefined) => {
      onChange({
        from: range?.from ? format(range.from, "yyyy-MM-dd") : "",
        to: range?.to ? format(range.to, "yyyy-MM-dd") : "",
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
            "justify-start text-left font-normal h-8 text-xs",
            !from && !to && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          mode="range"
          selected={selectedRange}
          onSelect={handleSelect}
          numberOfMonths={2}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
