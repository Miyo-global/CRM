"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, type CaptionProps, useNavigation, useDayPicker } from "react-day-picker"
import { setMonth, setYear } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function CalendarCaption({ displayMonth }: CaptionProps) {
  const { goToMonth, nextMonth, previousMonth } = useNavigation()
  const { fromYear, toYear, fromDate, toDate } = useDayPicker()

  const month = displayMonth.getMonth()
  const year = displayMonth.getFullYear()

  const startYear = fromYear ?? fromDate?.getFullYear() ?? 1950
  const endYear = toYear ?? toDate?.getFullYear() ?? new Date().getFullYear() + 5
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i)

  return (
    <div className="flex items-center justify-between w-full px-1">
      <button
        type="button"
        onClick={() => previousMonth && goToMonth(previousMonth)}
        disabled={!previousMonth}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "text-muted-foreground hover:text-foreground disabled:opacity-30"
        )}
        aria-label="Previous month"
      >
        <ChevronLeft />
      </button>

      <div className="flex items-center gap-1">
        <Select
          value={String(month)}
          onValueChange={(v) => goToMonth(setMonth(displayMonth, parseInt(v)))}
        >
          <SelectTrigger className="h-8 w-28 border-0 bg-transparent px-2 text-sm font-semibold shadow-none hover:bg-accent">
            <SelectValue>{MONTH_NAMES[month]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((name, i) => (
              <SelectItem key={name} value={String(i)}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(year)}
          onValueChange={(v) => goToMonth(setYear(displayMonth, parseInt(v)))}
        >
          <SelectTrigger className="h-8 min-w-19 w-auto border-0 bg-transparent px-2 text-sm font-semibold tabular-nums shadow-none hover:bg-accent [&_[data-slot=select-value]]:!line-clamp-none">
            <SelectValue>{year}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)} className="tabular-nums">
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <button
        type="button"
        onClick={() => nextMonth && goToMonth(nextMonth)}
        disabled={!nextMonth}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "text-muted-foreground hover:text-foreground disabled:opacity-30"
        )}
        aria-label="Next month"
      >
        <ChevronRight />
      </button>
    </div>
  )
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      captionLayout="dropdown-buttons"
      classNames={{
        months: "flex flex-col sm:flex-row gap-4 sm:gap-6",
        month: "space-y-3",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "hidden",
        nav: "hidden",
        nav_button: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "text-muted-foreground hover:text-foreground"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "w-9 text-2xs font-semibold uppercase text-subtle-foreground",
        row: "flex w-full mt-1",
        cell: "relative size-9 p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected].day-range-middle)]:bg-brand-soft [&:has([aria-selected].day-range-start)]:rounded-l-md [&:has([aria-selected].day-range-start)]:bg-brand-soft [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-range-end)]:bg-brand-soft",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "size-9 rounded-md p-0 text-sm font-normal tabular-nums aria-selected:opacity-100"
        ),
        day_range_start: "day-range-start",
        day_range_end: "day-range-end",
        day_selected: "bg-primary text-primary-foreground font-semibold hover:bg-primary-hover hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "relative font-semibold text-brand-text after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-gold-400 aria-selected:after:bg-primary-foreground",
        day_outside: "day-outside text-subtle-foreground aria-selected:bg-brand-soft aria-selected:text-subtle-foreground",
        day_disabled: "text-subtle-foreground opacity-50",
        day_range_middle: "day-range-middle aria-selected:rounded-none aria-selected:bg-brand-soft aria-selected:text-brand-soft-foreground aria-selected:font-normal",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Caption: CalendarCaption,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
