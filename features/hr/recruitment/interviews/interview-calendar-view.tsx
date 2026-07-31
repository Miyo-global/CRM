"use client";

import { memo, useCallback } from "react";

import type { Interview } from "@/types/hr";
import { BigCalendarWrapper, type BigCalEvent, type View } from "@/features/calendar/big-calendar-wrapper";
import { Card, CardContent } from "@/components/ui/card";

interface InterviewCalendarViewProps {
  interviews: Interview[];
  date: Date;
  view: View;
  onView: (view: View) => void;
  onNavigate: (date: Date) => void;
  onSelectInterview: (interview: Interview) => void;
}

export const InterviewCalendarView = memo(function InterviewCalendarView({
  interviews,
  date,
  view,
  onView,
  onNavigate,
  onSelectInterview,
}: InterviewCalendarViewProps) {
  const events: BigCalEvent[] = interviews.map((iv): BigCalEvent => ({
    id: iv.id,
    title: `${iv.candidate?.firstName ?? ""} ${iv.candidate?.lastName ?? ""} — ${iv.type ?? "Interview"}`,
    start: new Date(iv.scheduledAt),
    end: new Date(new Date(iv.scheduledAt).getTime() + (iv.duration ?? 60) * 60_000),
    resource: {
      color:
        iv.result === "PASSED"
          ? "#10b981"
          : iv.result === "FAILED"
          ? "#ef4444"
          : "#0f2b7f",
    },
  }));

  const handleSelectEvent = useCallback(
    (e: BigCalEvent) => {
      const iv = interviews.find((i) => i.id === e.id);
      if (iv) onSelectInterview(iv);
    },
    [interviews, onSelectInterview]
  );

  const eventPropGetter = useCallback(
    (e: object) => ({
      style: {
        backgroundColor: (e as BigCalEvent).resource?.color ?? "#0f2b7f",
        color: "#fff",
        borderRadius: 4,
        border: "none",
        fontSize: 11,
      },
    }),
    []
  );

  return (
    <Card>
      <CardContent className="p-4" style={{ height: 520 }}>
        <BigCalendarWrapper
          events={events}
          date={date}
          view={view}
          onView={onView}
          onNavigate={onNavigate}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventPropGetter}
        />
      </CardContent>
    </Card>
  );
});
