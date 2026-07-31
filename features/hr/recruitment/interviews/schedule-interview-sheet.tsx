"use client";

import { memo, useCallback, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { useScheduleInterview, useCandidates, useJobPostings } from "@/lib/api/hooks/hr";
import { useInterviewerAvailability } from "@/lib/api/hooks/hr/recruitment";
import { useCalendarOrgMembers } from "@/lib/api/hooks/calendar";
import { InterviewerAvailabilityGrid } from "@/components/hr/recruitment/interviewer-availability-grid";
import { InterviewFormatFields } from "@/components/hr/recruitment/interview-format-fields";
import { getErrorMessage } from "@/lib/get-error-message";
import { FutureDatetimeInput } from "@/components/ui/future-datetime-input";
import { type InterviewFormat, validateInterviewFormatFields } from "@/lib/constants/interview-format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";

interface CandidateCommandItemProps {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  selectedId: string;
  onSelect: (idStr: string) => void;
}

const CandidateCommandItem = memo(function CandidateCommandItem({
  id,
  firstName,
  lastName,
  email,
  selectedId,
  onSelect,
}: CandidateCommandItemProps) {
  const label = `${firstName} ${lastName}`.trim();
  const idStr = String(id);
  const handleSelect = useCallback(() => onSelect(idStr), [idStr, onSelect]);
  return (
    <CommandItem value={`${label} ${email ?? ""}`} onSelect={handleSelect}>
      <Check className={cn("mr-2 h-4 w-4", selectedId === idStr ? "opacity-100" : "opacity-0")} />
      <span className="truncate">{label}</span>
    </CommandItem>
  );
});

interface OrgMemberCommandItemProps {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
  selected: boolean;
  onToggle: (userId: string) => void;
}

const OrgMemberCommandItem = memo(function OrgMemberCommandItem({
  id,
  name,
  email,
  role,
  selected,
  onToggle,
}: OrgMemberCommandItemProps) {
  const label = name ?? email;
  const handleSelect = useCallback(() => onToggle(id), [id, onToggle]);
  return (
    <CommandItem value={`${label} ${email}`} onSelect={handleSelect}>
      <Check className={cn("mr-2 h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
      <div className="flex flex-col">
        <span className="text-sm">{label}</span>
        <span className="text-xs text-muted-foreground">{role}</span>
      </div>
    </CommandItem>
  );
});

interface InterviewerBadgeProps {
  id: string;
  name: string | null;
  email: string;
  onRemove: (userId: string) => void;
}

const InterviewerBadge = memo(function InterviewerBadge({
  id,
  name,
  email,
  onRemove,
}: InterviewerBadgeProps) {
  const label = name ?? email;
  const handleRemove = useCallback(() => onRemove(id), [id, onRemove]);
  return (
    <Badge variant="secondary" className="text-xs gap-1">
      {label}
      <button
        type="button"
        onClick={handleRemove}
        className="ml-0.5 rounded hover:text-destructive"
        aria-label={`Remove ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
});

interface ScheduleInterviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ScheduleInterviewSheet = memo(function ScheduleInterviewSheet({
  open,
  onOpenChange,
}: ScheduleInterviewSheetProps) {
  const { data: jobPostings } = useJobPostings({ status: "OPEN" });
  const { data: orgMembers } = useCalendarOrgMembers();
  const scheduleInterview = useScheduleInterview();

  const [candidatePickerOpen, setCandidatePickerOpen] = useState(false);
  const [interviewerPickerOpen, setInterviewerPickerOpen] = useState(false);
  const [candidateId, setCandidateId] = useState("");
  const [jobPostingId, setJobPostingId] = useState("");

  const { data: allCandidates } = useCandidates(
    jobPostingId ? { jobId: Number(jobPostingId) } : undefined,
    { enabled: !!jobPostingId },
  );
  const [format_, setFormat_] = useState<InterviewFormat>("VIDEO");
  const [meetingLink, setMeetingLink] = useState("");
  const [location, setLocation] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [interviewerIds, setInterviewerIds] = useState<string[]>([]);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(false);
  const sheetPortalRef = useRef<HTMLDivElement>(null);

  const selectedCandidate = useMemo(
    () => allCandidates?.find((c) => String(c.id) === candidateId),
    [allCandidates, candidateId]
  );

  const selectedInterviewers = useMemo(
    () => orgMembers?.filter((m) => interviewerIds.includes(m.id)) ?? [],
    [orgMembers, interviewerIds]
  );

  const jobPositionOptions = useMemo(
    () =>
      (jobPostings ?? []).map((jp) => ({
        value: String(jp.id),
        label: jp.title,
        keywords: [jp.location, jp.type, jp.workMode].filter(Boolean).join(" "),
      })),
    [jobPostings],
  );

  const availabilityDate = useMemo(() => {
    if (!scheduledAt) return null;
    const datePart = scheduledAt.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
    return datePart;
  }, [scheduledAt]);

  const { data: availabilityData } = useInterviewerAvailability(interviewerIds, availabilityDate);

  const interviewerNamesMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const iv of selectedInterviewers) {
      m.set(iv.id, iv.name ?? iv.email ?? "");
    }
    return m;
  }, [selectedInterviewers]);

  const resetForm = useCallback(() => {
    setCandidateId("");
    setJobPostingId("");
    setScheduledAt("");
    setInterviewerIds([]);
    setNotifyEmail(true);
    setNotifyWhatsApp(false);
    setDuration("60");
    setFormat_("VIDEO");
    setMeetingLink("");
    setLocation("");
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
      if (!nextOpen) resetForm();
    },
    [onOpenChange, resetForm]
  );

  const handleCandidateSelect = useCallback((idStr: string) => {
    setCandidateId(idStr);
    setCandidatePickerOpen(false);
  }, []);

  const toggleInterviewer = useCallback((userId: string) => {
    setInterviewerIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }, []);

  const handleFormatChange = useCallback((v: InterviewFormat) => setFormat_(v), []);
  const handleDurationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setDuration(e.target.value), []);
  const handleScheduledAtChange = useCallback((value: string) => setScheduledAt(value), []);

  const handleJobPostingChange = useCallback((value: string) => {
    setJobPostingId(value);
    setCandidateId("");
    setCandidatePickerOpen(false);
  }, []);

  const handleCreate = useCallback(() => {
    if (!jobPostingId) {
      toast.error("Job position is required");
      return;
    }
    if (!candidateId || !scheduledAt) {
      toast.error("Candidate and scheduled date are required");
      return;
    }
    if (interviewerIds.length === 0) {
      toast.error("At least one interviewer is required");
      return;
    }
    if (new Date(scheduledAt).getTime() < Date.now()) {
      toast.error("Interview cannot be scheduled in the past");
      return;
    }
    const formatError = validateInterviewFormatFields(format_, meetingLink, location);
    if (formatError) {
      toast.error(formatError);
      return;
    }
    scheduleInterview.mutate(
      {
        candidateId: Number(candidateId),
        jobPostingId: jobPostingId ? Number(jobPostingId) : undefined,
        format: format_,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes: Number(duration) || 60,
        meetingLink: meetingLink || undefined,
        location: location || undefined,
        interviewers: interviewerIds,
        notifyChannels: { email: notifyEmail, whatsapp: notifyWhatsApp },
      },
      {
        onSuccess: () => {
          toast.success("Interview scheduled");
          handleOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [
    candidateId, jobPostingId, format_, meetingLink, location, scheduledAt, duration,
    interviewerIds, notifyEmail, notifyWhatsApp, scheduleInterview, handleOpenChange,
  ]);

  const handleCancel = useCallback(() => handleOpenChange(false), [handleOpenChange]);

  const sheetPopoverContainer = sheetPortalRef.current;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Schedule Interview
        </Button>
      </SheetTrigger>
      <SheetContent className="flex h-svh max-h-svh flex-col gap-0 p-0">
        <div ref={sheetPortalRef} className="flex min-h-0 flex-1 flex-col">
        <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
          <SheetTitle className="text-base">Schedule Interview</SheetTitle>
          <SheetDescription className="text-xs">
            Set up an interview with a candidate. Notifications will be sent to interviewers and the candidate.
          </SheetDescription>
        </SheetHeader>

        <div className="shrink-0 space-y-4 border-b bg-background px-4 py-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Job Position <span className="text-destructive">*</span>
            </label>
            <SearchableSelect
              options={jobPositionOptions}
              value={jobPostingId}
              onValueChange={handleJobPostingChange}
              placeholder="Select position..."
              searchPlaceholder="Search positions..."
              emptyText="No open positions found."
              popoverContainer={sheetPopoverContainer}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Candidate <span className="text-destructive">*</span>
            </label>
            <Popover open={candidatePickerOpen} onOpenChange={setCandidatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={candidatePickerOpen}
                  disabled={!jobPostingId}
                  className="w-full justify-between font-normal"
                >
                  <span className="truncate">
                    {!jobPostingId
                      ? "Select a job position first"
                      : selectedCandidate
                        ? `${selectedCandidate.firstName} ${selectedCandidate.lastName}`
                        : "Select candidate"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0 overflow-hidden"
                align="start"
                container={sheetPopoverContainer ?? undefined}
                collisionPadding={16}
                onOpenAutoFocus={(e) => e.preventDefault()}
                onWheelCapture={(e) => e.stopPropagation()}
              >
                <Command className="flex h-auto max-h-[min(300px,70vh)] min-h-0 w-full flex-col overflow-hidden">
                  <CommandInput placeholder="Search candidates..." className="h-9 shrink-0" />
                  <CommandList className="max-h-[min(240px,60vh)] min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
                    <CommandEmpty>No candidates applied for this position.</CommandEmpty>
                    <CommandGroup>
                      {allCandidates?.map((c) => (
                        <CandidateCommandItem
                          key={c.id}
                          id={c.id}
                          firstName={c.firstName}
                          lastName={c.lastName}
                          email={c.email}
                          selectedId={candidateId}
                          onSelect={handleCandidateSelect}
                        />
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Date &amp; Time <span className="text-destructive">*</span>
            </label>
            <FutureDatetimeInput
              active={open}
              value={scheduledAt}
              onChange={handleScheduledAtChange}
              pastMessage="Interview cannot be scheduled in the past"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Interviewers <span className="text-destructive">*</span>
            </label>
            {selectedInterviewers.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {selectedInterviewers.map((m) => (
                  <InterviewerBadge
                    key={m.id}
                    id={m.id}
                    name={m.name}
                    email={m.email}
                    onRemove={toggleInterviewer}
                  />
                ))}
              </div>
            )}
            <Popover open={interviewerPickerOpen} onOpenChange={setInterviewerPickerOpen} modal>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start font-normal text-muted-foreground"
                  size="sm"
                >
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Add interviewer
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0 overflow-hidden"
                align="start"
                container={sheetPopoverContainer ?? undefined}
                collisionPadding={16}
                onOpenAutoFocus={(e) => e.preventDefault()}
                onWheelCapture={(e) => e.stopPropagation()}
              >
                <Command className="flex h-auto max-h-[min(300px,70vh)] min-h-0 w-full flex-col overflow-hidden">
                  <CommandInput placeholder="Search members..." className="h-9 shrink-0" />
                  <CommandList className="max-h-[min(240px,60vh)] min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
                    <CommandEmpty>No members found.</CommandEmpty>
                    <CommandGroup>
                      {orgMembers?.map((m) => (
                        <OrgMemberCommandItem
                          key={m.id}
                          id={m.id}
                          name={m.name}
                          email={m.email}
                          role={m.role}
                          selected={interviewerIds.includes(m.id)}
                          onToggle={toggleInterviewer}
                        />
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain px-4 py-4">
          <InterviewFormatFields
            format={format_}
            onFormatChange={handleFormatChange}
            meetingLink={meetingLink}
            onMeetingLinkChange={setMeetingLink}
            location={location}
            onLocationChange={setLocation}
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Duration (min)</label>
            <Input type="number" min={15} value={duration} onChange={handleDurationChange} />
          </div>

          {availabilityData && availabilityData.availability.length > 0 && (
            <InterviewerAvailabilityGrid
              availability={availabilityData.availability}
              interviewerNames={interviewerNamesMap}
              selectedTime={scheduledAt || null}
              durationMinutes={Number(duration) || 60}
            />
          )}

          <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Notification Channels
            </p>
            <div className="flex items-center justify-between">
              <label className="text-sm">Email</label>
              <Switch
                checked={notifyEmail}
                onCheckedChange={setNotifyEmail}
                aria-label="Send email notifications"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm">WhatsApp</label>
                <p className="text-xs text-muted-foreground">Requires Twilio configuration</p>
              </div>
              <Switch
                checked={notifyWhatsApp}
                onCheckedChange={setNotifyWhatsApp}
                aria-label="Send WhatsApp notifications"
              />
            </div>
          </div>
        </div>

        <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={handleCancel}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleCreate} disabled={scheduleInterview.isPending}>
            {scheduleInterview.isPending ? "Scheduling..." : "Schedule"}
          </Button>
        </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
});
