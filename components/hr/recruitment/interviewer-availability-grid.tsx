"use client";

import { useMemo } from "react";
import type { InterviewerAvailability } from "@/lib/api/hooks/hr/recruitment";
import { cn } from "@/lib/utils";

const WORK_START = 9;
const WORK_END = 19;
const TOTAL_HOURS = WORK_END - WORK_START;
const SLOT_WIDTH_PX = 36;

interface InterviewerAvailabilityGridProps {
  availability: InterviewerAvailability[];
  interviewerNames: Map<string, string>;
  selectedTime: string | null;
  durationMinutes: number;
}

function getHourLabels(): string[] {
  const labels: string[] = [];
  for (let h = WORK_START; h < WORK_END; h++) {
    labels.push(h <= 12 ? `${h}${h < 12 ? "a" : "p"}` : `${h - 12}p`);
  }
  return labels;
}

function timeToOffset(date: Date): number {
  const hours = date.getHours() + date.getMinutes() / 60;
  return Math.max(0, Math.min(TOTAL_HOURS, hours - WORK_START));
}

export function InterviewerAvailabilityGrid({
  availability,
  interviewerNames,
  selectedTime,
  durationMinutes,
}: InterviewerAvailabilityGridProps) {
  const hourLabels = useMemo(() => getHourLabels(), []);

  const proposedBlock = useMemo(() => {
    if (!selectedTime) return null;
    const start = new Date(selectedTime);
    if (Number.isNaN(start.getTime())) return null;
    const startOffset = timeToOffset(start);
    const widthHours = durationMinutes / 60;
    return {
      left: (startOffset / TOTAL_HOURS) * 100,
      width: (widthHours / TOTAL_HOURS) * 100,
    };
  }, [selectedTime, durationMinutes]);

  if (availability.length === 0) return null;

  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Availability ({WORK_START > 12 ? `${WORK_START - 12} PM` : `${WORK_START} AM`} – {WORK_END > 12 ? `${WORK_END - 12} PM` : `${WORK_END} AM`})
      </p>

      <div className="relative ml-20">
        <div className="flex">
          {hourLabels.map((label) => (
            <div
              key={label}
              className="text-[10px] text-muted-foreground"
              style={{ width: `${100 / TOTAL_HOURS}%` }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      {availability.map((iv) => (
        <div key={iv.interviewerId} className="flex items-center gap-2">
          <span className="text-xs truncate w-18 shrink-0 text-right text-muted-foreground">
            {interviewerNames.get(iv.interviewerId)?.split(" ")[0] ?? ""}
          </span>
          <div className="relative flex-1 h-5 rounded bg-emerald-100 dark:bg-emerald-900/30 overflow-hidden">
            {iv.busyBlocks.map((block, idx) => {
              const start = new Date(block.start);
              const end = new Date(block.end);
              const leftPct = (timeToOffset(start) / TOTAL_HOURS) * 100;
              const widthPct =
                ((timeToOffset(end) - timeToOffset(start)) / TOTAL_HOURS) * 100;
              if (widthPct <= 0) return null;
              return (
                <div
                  key={idx}
                  className="absolute top-0 h-full bg-destructive/60 rounded-sm"
                  style={{ left: `${Math.max(0, leftPct)}%`, width: `${Math.min(widthPct, 100 - leftPct)}%` }}
                  title={`${block.title} (${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`}
                />
              );
            })}
            {proposedBlock && (
              <div
                className="absolute top-0 h-full border-2 border-blue rounded-sm bg-blue/20"
                style={{ left: `${proposedBlock.left}%`, width: `${proposedBlock.width}%` }}
              />
            )}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-4 text-[10px] text-muted-foreground ml-20">
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm bg-emerald-100 dark:bg-emerald-900/30 border" />
          Free
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm bg-destructive/60" />
          Busy
        </div>
        {proposedBlock && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 rounded-sm border-2 border-blue bg-blue/20" />
            Proposed
          </div>
        )}
      </div>
    </div>
  );
}
