"use client";

import { memo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { FutureDatetimeInput } from "@/components/ui/future-datetime-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { HrSheet } from "@/features/hr/hr-sheet";
import { InterviewFormatFields } from "@/components/hr/recruitment/interview-format-fields";
import type { InterviewFormat } from "@/lib/constants/interview-format";

export interface OrgMember {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
}

export interface CandidateApplication {
  id: number;
  jobPostingId: number;
  jobTitle: string;
}

interface ScheduleInterviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  format: InterviewFormat;
  scheduledAt: string;
  duration: string;
  meetingLink: string;
  location: string;
  interviewerId: string;
  applicationId: string;
  isPending: boolean;
  members: OrgMember[];
  applications: CandidateApplication[];
  onFormatChange: (format: InterviewFormat) => void;
  onScheduledAtChange: (value: string) => void;
  onDurationChange: (value: string) => void;
  onMeetingLinkChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onInterviewerIdChange: (value: string) => void;
  onApplicationIdChange: (value: string) => void;
  onSubmit: () => void;
}

export const ScheduleInterviewSheet = memo(function ScheduleInterviewSheet({
  open,
  onOpenChange,
  format,
  scheduledAt,
  duration,
  meetingLink,
  location,
  interviewerId,
  applicationId,
  isPending,
  members,
  applications,
  onFormatChange,
  onScheduledAtChange,
  onDurationChange,
  onMeetingLinkChange,
  onLocationChange,
  onInterviewerIdChange,
  onApplicationIdChange,
  onSubmit,
}: ScheduleInterviewSheetProps) {
  const handleScheduledAtChange = useCallback(
    (value: string) => onScheduledAtChange(value),
    [onScheduledAtChange],
  );
  const handleDurationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onDurationChange(e.target.value),
    [onDurationChange],
  );

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Schedule Interview"
      onSubmit={onSubmit}
      submitLabel="Schedule"
      isPending={isPending}
      pinned={
        <>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Interviewer <span className="text-destructive">*</span></label>
            <Select value={interviewerId} onValueChange={onInterviewerIdChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select interviewer" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name ?? m.email ?? m.id}
                    {m.role ? <span className="ml-1 text-muted-foreground text-xs">({m.role})</span> : null}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Date &amp; Time <span className="text-destructive">*</span></label>
            <FutureDatetimeInput
              active={open}
              value={scheduledAt}
              onChange={handleScheduledAtChange}
              pastMessage="Interview cannot be scheduled in the past"
            />
          </div>
        </>
      }
    >
      <InterviewFormatFields
        format={format}
        onFormatChange={onFormatChange}
        meetingLink={meetingLink}
        onMeetingLinkChange={onMeetingLinkChange}
        location={location}
        onLocationChange={onLocationChange}
      />

      {applications.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Link to Job Application</label>
          <Select value={applicationId} onValueChange={onApplicationIdChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select job (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— No specific job —</SelectItem>
              {applications.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.jobTitle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Duration (min)</label>
        <Input type="number" min={15} max={480} step={5} value={duration} onChange={handleDurationChange} />
      </div>
    </HrSheet>
  );
});
