"use client";

import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
const Calendar = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" /><path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" /></svg>
);
import { format } from "date-fns";

interface Interview {
  id: number;
  type: string | null;
  scheduledAt: string | Date;
  duration: number | null;
  result?: string | null;
}

interface InterviewRowProps {
  interview: Interview;
}

const InterviewRow = memo(function InterviewRow({ interview }: InterviewRowProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3">
        <div>
          <p className="text-sm font-medium">{interview.type ?? "Unknown"} Interview</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(interview.scheduledAt), "PPp")} &middot; {interview.duration ?? "?"}min
          </p>
        </div>
        <Badge
          variant={
            interview.result === "PASSED"
              ? "default"
              : interview.result === "FAILED"
                ? "destructive"
                : "outline"
          }
          className="text-[10px]"
        >
          {interview.result ?? "PENDING"}
        </Badge>
      </div>
    </div>
  );
});

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
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Interviews</CardTitle>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleScheduleClick}>
          <Calendar className="h-3 w-3 mr-1" />Schedule
        </Button>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {!interviews?.length ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No interviews scheduled.
          </p>
        ) : (
          <div className="space-y-3">
            {interviews.map((interview) => (
              <InterviewRow key={interview.id} interview={interview} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
