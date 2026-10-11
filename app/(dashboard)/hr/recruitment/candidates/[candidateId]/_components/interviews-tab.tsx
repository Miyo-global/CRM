"use client";

import { memo, useCallback } from "react";
import { Calendar, CheckCircle2, Clock, UserX, XCircle } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { Timeline } from "@/components/shared/timeline";
import type { IconChipProps } from "@/components/ui/icon-chip";
import type { Tone } from "@/lib/design/tones";

interface Interview {
  id: number;
  type: string | null;
  scheduledAt: string | Date;
  duration: number | null;
  result?: string | null;
}

const RESULT_META: Record<string, { tone: Tone; icon: IconChipProps["icon"] }> = {
  PENDING: { tone: "warning", icon: Clock },
  PASSED: { tone: "success", icon: CheckCircle2 },
  FAILED: { tone: "danger", icon: XCircle },
  NO_SHOW: { tone: "neutral", icon: UserX },
};

interface InterviewsTabProps {
  interviews?: Interview[] | null;
  onScheduleOpen: () => void;
}

export const InterviewsTab = memo(function InterviewsTab({
  interviews,
  onScheduleOpen,
}: InterviewsTabProps) {
  const handleScheduleClick = useCallback(() => onScheduleOpen(), [onScheduleOpen]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Interviews</CardTitle>
        <Button size="sm" variant="outline" onClick={handleScheduleClick}>
          <Calendar className="size-4" aria-hidden="true" />Schedule
        </Button>
      </CardHeader>
      <CardContent>
        {!interviews?.length ? (
          <EmptyState
            compact
            illustration={<EmptyCalendarIllustration className="size-24" />}
            title="No interviews scheduled."
            className="border-0 bg-transparent"
          />
        ) : (
          <Timeline
            items={interviews.map((interview) => {
              const result = interview.result ?? "PENDING";
              const meta = RESULT_META[result] ?? RESULT_META.PENDING;
              return {
                id: String(interview.id),
                icon: meta.icon,
                tone: meta.tone,
                title: <span className="font-medium">{interview.type ?? "Unknown"} Interview</span>,
                body: (
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="tabular-nums">
                      {format(new Date(interview.scheduledAt), "PPp")} &middot; {interview.duration ?? "?"}min
                    </span>
                    <StatusPill tone={meta.tone} dot>{result}</StatusPill>
                  </span>
                ),
                timestamp: interview.scheduledAt,
              };
            })}
          />
        )}
      </CardContent>
    </Card>
  );
});
