"use client";

import { CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useMyShift } from "@/lib/api/hooks/hr";
import { formatShiftDays, formatShiftWindow } from "@/lib/hr/shifts";

/** The employee's current shift, read-only. Hidden when they have none. */
export function MyShiftCard() {
  const { data: shift } = useMyShift();
  if (!shift) return null;
  return (
    <Card className="flex items-center gap-3 px-5 py-3">
      <CalendarClock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <p className="text-sm">
        <span className="text-muted-foreground">My shift: </span>
        <span className="font-medium">{shift.name}</span>
        <span className="text-muted-foreground">
          {" · "}
          {formatShiftWindow(shift.startTime, shift.endTime)} · {formatShiftDays(shift.daysOfWeek)}
          {shift.effectiveTo ? ` · until ${shift.effectiveTo}` : ""}
        </span>
      </p>
    </Card>
  );
}
