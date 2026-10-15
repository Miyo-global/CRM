"use client";

import { useState, useCallback, useMemo } from "react";
import { format, parseISO, isValid, startOfDay } from "date-fns";
import { CalendarDays } from "lucide-react";
import type { Matcher } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  fromDate?: Date;
  toDate?: Date;
  fromYear?: number;
  toYear?: number;
  id?: string;
  /**
   * Disables matching days in the calendar (react-day-picker `Matcher`).
   * In addition, when `fromDate` / `toDate` are set, days outside that range are disabled.
   */
  calendarDisabled?: Matcher | Matcher[];
  /** Marks the trigger as invalid for a11y (e.g. form validation). */
  invalid?: boolean;
  /** e.g. id of inline error element when `invalid` is true. */
  ariaDescribedBy?: string;
}

function parseDateValue(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  className,
  fromDate,
  toDate,
  fromYear = 1950,
  toYear = new Date().getFullYear() + 5,
  id,
  calendarDisabled,
  invalid,
  ariaDescribedBy,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseDateValue(value);

  const disabledMatchers = useMemo(() => {
    const list: Matcher[] = [];
    if (fromDate) {
      const min = startOfDay(fromDate);
      list.push((d) => startOfDay(d) < min);
    }
    if (toDate) {
      const max = startOfDay(toDate);
      list.push((d) => startOfDay(d) > max);
    }
    if (calendarDisabled !== undefined) {
      const extra = Array.isArray(calendarDisabled) ? calendarDisabled : [calendarDisabled];
      list.push(...extra);
    }
    if (list.length === 0) return undefined;
    return list.length === 1 ? list[0] : list;
  }, [fromDate, toDate, calendarDisabled]);

  const handleSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) return;
      const d = startOfDay(date);
      if (fromDate && d < startOfDay(fromDate)) return;
      if (toDate && d > startOfDay(toDate)) return;
      onChange(format(date, "yyyy-MM-dd"));
      setOpen(false);
    },
    [onChange, fromDate, toDate],
  );

  const handleOpenChange = useCallback((o: boolean) => setOpen(o), []);

  /**
   * Month the calendar opens on: the selected date, else today clamped into
   * the allowed range. Without this a date-of-birth picker opened on a month
   * where every day was already out of range (A23).
   */
  const defaultMonth = useMemo(() => {
    if (selected) return selected;
    const today = startOfDay(new Date());
    if (fromDate && today < startOfDay(fromDate)) return startOfDay(fromDate);
    if (toDate && today > startOfDay(toDate)) return startOfDay(toDate);
    return today;
  }, [selected, fromDate, toDate]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={ariaDescribedBy}
          className={cn(
            "h-9 w-full justify-start gap-2 border-input bg-card px-3 text-left text-sm font-normal shadow-xs hover:bg-card focus-visible:focus-ring focus-visible:border-ring aria-invalid:border-destructive",
            !selected && "text-subtle-foreground",
            className
          )}
        >
          <CalendarDays className="text-muted-foreground" />
          {selected ? format(selected, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          defaultMonth={defaultMonth}
          fromDate={fromDate}
          toDate={toDate}
          fromYear={fromYear}
          toYear={toYear}
          disabled={disabledMatchers}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
