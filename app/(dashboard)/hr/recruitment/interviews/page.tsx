"use client";
import { getErrorMessage } from "@/lib/get-error-message";
import { FutureDatetimeInput } from "@/components/ui/future-datetime-input";

import { useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useInterviews, useScheduleInterview, useUpdateInterview, useCandidates, useJobPostings } from "@/lib/api/hooks/hr";
import { useBulkRescheduleInterviews, useInterviewerAvailability } from "@/lib/api/hooks/hr/recruitment";
import { InterviewerAvailabilityGrid } from "@/components/hr/recruitment/interviewer-availability-grid";
import { InterviewFormatFields } from "@/components/hr/recruitment/interview-format-fields";
import { type InterviewFormat, validateInterviewFormatFields } from "@/lib/constants/interview-format";
import { useCalendarOrgMembers } from "@/lib/api/hooks/calendar";
import { InterviewFeedbackForm } from "@/features/hr/recruitment/interview-feedback-form";
import type { Interview } from "@/types/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageBackButton } from "@/components/ui/page-back-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, ChevronsUpDown, Plus, X, List, CalendarDays, ChevronLeft, ChevronRight, BarChart2 } from "lucide-react";
import { BigCalendarWrapper, type BigCalEvent, type View } from "@/features/calendar/big-calendar-wrapper";
import { startOfMonth, endOfMonth, addMonths, subMonths, addWeeks, subWeeks, format as fmtDate } from "date-fns";
import { format } from "date-fns";
import type { InterviewResult } from "@/types/hr";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/design/tones";
import { eventToneStyle } from "@/features/calendar/event-tones";

const RESULT_TONE: Record<InterviewResult, Tone> = {
  PENDING: "neutral",
  PASSED: "success",
  FAILED: "danger",
  NO_SHOW: "warning",
};

const RESULT_LABEL: Record<InterviewResult, string> = {
  PENDING: "Pending",
  PASSED: "Passed",
  FAILED: "Failed",
  NO_SHOW: "No show",
};

const segmentClass = (active: boolean) =>
  cn(
    "flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors focus-ring",
    active ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
  );

export default function InterviewsPage() {
  const { data: interviews, isLoading, isError, error, refetch } = useInterviews();
  const { data: jobPostings } = useJobPostings({ status: "OPEN" });
  const { data: orgMembers } = useCalendarOrgMembers();
  const scheduleInterview = useScheduleInterview();
  const updateInterview = useUpdateInterview();
  const bulkReschedule = useBulkRescheduleInterviews();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkNewDate, setBulkNewDate] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [feedbackInterview, setFeedbackInterview] = useState<Interview | null>(null);
  const [pageView, setPageView] = useState<"list" | "calendar">("list");
  const [calView, setCalView] = useState<View>("month");
  const [calDate, setCalDate] = useState(new Date());
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
    const d = new Date(scheduledAt);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }, [scheduledAt]);

  const { data: availabilityData } = useInterviewerAvailability(interviewerIds, availabilityDate);

  const interviewerNamesMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const iv of selectedInterviewers) {
      m.set(iv.id, iv.name ?? iv.email ?? "");
    }
    return m;
  }, [selectedInterviewers]);

  const toggleInterviewer = useCallback((userId: string) => {
    setInterviewerIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }, []);

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
    const durationMinutes = Number(duration);
    if (!Number.isFinite(durationMinutes) || durationMinutes < 15 || durationMinutes > 480) {
      toast.error("Duration must be between 15 and 480 minutes");
      return;
    }
    const scheduledDate = new Date(scheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) {
      toast.error("Enter a valid scheduled date and time");
      return;
    }
    if (scheduledDate.getTime() < Date.now()) {
      toast.error("Scheduled date and time must be in the future");
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
        scheduledAt: scheduledDate.toISOString(),
        durationMinutes,
        meetingLink: meetingLink || undefined,
        location: location || undefined,
        interviewers: interviewerIds,
        notifyChannels: { email: notifyEmail, whatsapp: notifyWhatsApp },
      },
      {
        onSuccess: () => {
          toast.success("Interview scheduled");
          setSheetOpen(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [candidateId, jobPostingId, format_, meetingLink, location, scheduledAt, duration, interviewerIds, notifyEmail, notifyWhatsApp, scheduleInterview, resetForm]);

  const sheetPopoverContainer = sheetPortalRef.current;

  const handleResultChange = useCallback(
    (id: number, result: InterviewResult) => {
      updateInterview.mutate({ id, result }, {
        onSuccess: () => toast.success("Interview result updated"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [updateInterview]
  );

  const handleBulkReschedule = useCallback(() => {
    if (!bulkNewDate) { toast.error("Select a new date first"); return; }
    if (selectedIds.size === 0) return;
    const newDate = new Date(bulkNewDate);
    if (Number.isNaN(newDate.getTime())) { toast.error("Enter a valid date and time"); return; }
    if (newDate.getTime() < Date.now()) { toast.error("New date and time must be in the future"); return; }
    bulkReschedule.mutate(
      { ids: Array.from(selectedIds), scheduledAt: newDate.toISOString() },
      {
        onSuccess: (data) => {
          toast.success(`${data.rescheduled} interview${data.rescheduled !== 1 ? "s" : ""} rescheduled`);
          setSelectedIds(new Set());
          setBulkNewDate("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [bulkNewDate, selectedIds, bulkReschedule]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (!interviews) return;
    setSelectedIds((prev) =>
      prev.size === interviews.length
        ? new Set()
        : new Set(interviews.map((iv) => iv.id))
    );
  }, [interviews]);

  if (isLoading) {
    return (
      <PageWrapper title="Interviews" subtitle="Schedule and track interviews">
        <Card><CardContent className="space-y-3 pt-6">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</CardContent></Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Interviews"
      subtitle="Schedule and track interviews"
      badge={`${interviews?.length ?? 0} interviews`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <PageBackButton fallback="/hr/recruitment" />
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/recruitment/interviewer-performance">
              <BarChart2 className="size-3.5" aria-hidden="true" />
              Performance
            </Link>
          </Button>
          <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) resetForm(); }}>
            <SheetTrigger asChild>
              <Button size="sm"><Plus className="size-4" aria-hidden="true" />Schedule Interview</Button>
            </SheetTrigger>
            <SheetContent className="flex h-svh max-h-svh flex-col gap-0 p-0">
              <div ref={sheetPortalRef} className="flex min-h-0 flex-1 flex-col">
              <SheetHeader className="shrink-0 border-b border-border px-4 pt-4 pb-3">
                <SheetTitle className="text-base">Schedule Interview</SheetTitle>
                <SheetDescription className="text-xs">Set up an interview with a candidate. Notifications will be sent to interviewers and the candidate.</SheetDescription>
              </SheetHeader>

              <div className="shrink-0 space-y-4 border-b border-border bg-background px-4 py-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Job Position <span className="text-destructive">*</span></label>
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
                  <label className="text-sm font-medium">Candidate <span className="text-destructive">*</span></label>
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
                            {allCandidates?.map((c) => {
                              const label = `${c.firstName} ${c.lastName}`.trim();
                              const idStr = String(c.id);
                              return (
                                <CommandItem
                                  key={c.id}
                                  value={`${label} ${c.email ?? ""}`}
                                  onSelect={() => { setCandidateId(idStr); setCandidatePickerOpen(false); }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", candidateId === idStr ? "opacity-100" : "opacity-0")} />
                                  <span className="truncate">{label}</span>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Date & Time <span className="text-destructive">*</span></label>
                  <FutureDatetimeInput
                    active={sheetOpen}
                    value={scheduledAt}
                    onChange={setScheduledAt}
                    pastMessage="Scheduled date and time must be in the future"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Interviewers <span className="text-destructive">*</span></label>
                  {selectedInterviewers.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {selectedInterviewers.map((m) => (
                        <Badge key={m.id} variant="secondary" className="text-xs gap-1">
                          {m.name ?? m.email}
                          <button
                            type="button"
                            onClick={() => toggleInterviewer(m.id)}
                            className="ml-0.5 rounded hover:text-destructive"
                            aria-label={`Remove ${m.name ?? m.email}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Popover open={interviewerPickerOpen} onOpenChange={setInterviewerPickerOpen} modal>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-start font-normal text-muted-foreground" size="sm">
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
                            {orgMembers?.map((m) => {
                              const label = m.name ?? m.email;
                              const selected = interviewerIds.includes(m.id);
                              return (
                                <CommandItem
                                  key={m.id}
                                  value={`${label} ${m.email}`}
                                  onSelect={() => toggleInterviewer(m.id)}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                                  <div className="flex flex-col">
                                    <span className="text-sm">{label}</span>
                                    <span className="text-xs text-muted-foreground">{m.role}</span>
                                  </div>
                                </CommandItem>
                              );
                            })}
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
                  onFormatChange={setFormat_}
                  meetingLink={meetingLink}
                  onMeetingLinkChange={setMeetingLink}
                  location={location}
                  onLocationChange={setLocation}
                />

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Duration (min)</label>
                  <Input type="number" min={15} value={duration} onChange={(e) => setDuration(e.target.value)} />
                </div>

                {availabilityData && availabilityData.availability.length > 0 && (
                  <InterviewerAvailabilityGrid
                    availability={availabilityData.availability}
                    interviewerNames={interviewerNamesMap}
                    selectedTime={scheduledAt || null}
                    durationMinutes={Number(duration) || 60}
                  />
                )}

                <div className="space-y-2 rounded-lg border border-border bg-surface-sunken p-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notification Channels</p>
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Email</label>
                    <Switch checked={notifyEmail} onCheckedChange={setNotifyEmail} aria-label="Send email notifications" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm">WhatsApp</label>
                      <p className="text-xs text-muted-foreground">Requires Twilio configuration</p>
                    </div>
                    <Switch checked={notifyWhatsApp} onCheckedChange={setNotifyWhatsApp} aria-label="Send WhatsApp notifications" />
                  </div>
                </div>
              </div>
              <SheetFooter className="shrink-0 flex-row gap-2 border-t border-border px-4 py-3">
                <Button variant="outline" className="flex-1" onClick={() => { setSheetOpen(false); resetForm(); }}>Cancel</Button>
                <Button className="flex-1" onClick={handleCreate} loading={scheduleInterview.isPending}>
                  {scheduleInterview.isPending ? "Scheduling..." : "Schedule"}
                </Button>
              </SheetFooter>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      }
      filters={
        <ListToolbar
          filters={
            pageView === "calendar" ? (
              <>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setCalDate(calView === "month" ? subMonths(calDate, 1) : subWeeks(calDate, 1))}
                  aria-label="Previous"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </Button>
                <span className="min-w-32 text-center text-sm font-medium tabular-nums">
                  {calView === "month" ? fmtDate(calDate, "MMMM yyyy") : `Week of ${fmtDate(calDate, "MMM d")}`}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setCalDate(calView === "month" ? addMonths(calDate, 1) : addWeeks(calDate, 1))}
                  aria-label="Next"
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
                <div className="flex items-center gap-0.5 rounded-md bg-muted p-0.5">
                  {(["month", "week"] as View[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={cn(segmentClass(calView === v), "capitalize")}
                      onClick={() => setCalView(v)}
                      aria-pressed={calView === v}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </>
            ) : undefined
          }
          view={
            <div className="flex items-center gap-0.5 rounded-md bg-muted p-0.5">
              <button
                type="button"
                className={segmentClass(pageView === "list")}
                onClick={() => setPageView("list")}
                aria-pressed={pageView === "list"}
              >
                <List className="size-3.5" aria-hidden="true" />
                List
              </button>
              <button
                type="button"
                className={segmentClass(pageView === "calendar")}
                onClick={() => setPageView("calendar")}
                aria-pressed={pageView === "calendar"}
              >
                <CalendarDays className="size-3.5" aria-hidden="true" />
                Calendar
              </button>
            </div>
          }
        />
      }
    >
      {selectedIds.size > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-sticky flex justify-center px-4">
          <div
            role="toolbar"
            aria-label="Bulk actions"
            className="pointer-events-auto flex min-h-11 flex-wrap items-center justify-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-secondary-foreground shadow-lg"
          >
            <span className="text-sm font-medium tabular-nums">{selectedIds.size} selected</span>
            <Input
              type="datetime-local"
              className="h-8 w-52 bg-background text-xs text-foreground"
              value={bulkNewDate}
              onChange={(e) => setBulkNewDate(e.target.value)}
              placeholder="New date & time"
            />
            <Button
              size="sm"
              onClick={handleBulkReschedule}
              loading={bulkReschedule.isPending}
              disabled={!bulkNewDate}
            >
              {bulkReschedule.isPending ? "Rescheduling..." : "Reschedule Selected"}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-secondary-foreground hover:bg-secondary-foreground/10 hover:text-secondary-foreground"
              onClick={() => { setSelectedIds(new Set()); setBulkNewDate(""); }}
              aria-label="Clear selection"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {isError ? (
        <QueryErrorState title="Couldn't load interviews" error={error} onRetry={() => refetch()} />
      ) : pageView === "calendar" ? (
        <Card>
          <CardContent className="calendar-container p-4" style={{ height: 520 }}>
            <BigCalendarWrapper
              events={(interviews ?? []).map((iv): BigCalEvent => ({
                id: iv.id,
                title: `${iv.candidate?.firstName ?? ""} ${iv.candidate?.lastName ?? ""} — ${iv.type ?? "Interview"}`,
                start: new Date(iv.scheduledAt),
                end: new Date(new Date(iv.scheduledAt).getTime() + (iv.duration ?? 60) * 60_000),
                resource: {
                  color: iv.result === "PASSED" ? "success" : iv.result === "FAILED" ? "danger" : "brand",
                },
              }))}
              date={calDate}
              view={calView}
              onView={setCalView}
              onNavigate={setCalDate}
              onSelectEvent={(e) => {
                const iv = interviews?.find((i) => i.id === e.id);
                if (iv) setFeedbackInterview(iv as Interview);
              }}
              eventPropGetter={(e) => ({
                style: eventToneStyle(((e as BigCalEvent).resource?.color as Tone | undefined) ?? "brand"),
              })}
            />
          </CardContent>
        </Card>
      ) : !interviews?.length ? (
        <EmptyState
          illustration={<EmptyCalendarIllustration className="size-32" />}
          title="No interviews scheduled."
          action={{ label: "Schedule Interview", onClick: () => setSheetOpen(true) }}
        />
      ) : (
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={!!interviews?.length && selectedIds.size === interviews.length}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all interviews"
                />
              </TableHead>
              <TableHead>Candidate</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead>Result</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {interviews.map((interview) => {
              const panelIds = (interview as Interview & { panelInterviewerIds?: string[] }).panelInterviewerIds;
              return (
                <TableRow key={interview.id} data-state={selectedIds.has(interview.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(interview.id)}
                      onCheckedChange={() => toggleSelect(interview.id)}
                      aria-label={`Select interview ${interview.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-44 items-center gap-2.5">
                      <Avatar className="size-8">
                        <AvatarFallback>
                          {interview.candidate?.firstName?.charAt(0)}
                          {interview.candidate?.lastName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {interview.candidate?.firstName} {interview.candidate?.lastName}
                        </p>
                        {interview.candidate?.email && (
                          <p className="max-w-52 truncate text-xs text-muted-foreground" title={interview.candidate.email}>
                            {interview.candidate.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline">{interview.type}</Badge>
                      {panelIds && panelIds.length > 1 && (
                        <Badge variant="secondary">Panel ({panelIds.length})</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm tabular-nums">
                    {format(new Date(interview.scheduledAt), "PPp")}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">{interview.duration} min</TableCell>
                  <TableCell>
                    <StatusPill tone={interview.result ? RESULT_TONE[interview.result] : "neutral"} dot>
                      {interview.result ? RESULT_LABEL[interview.result] : "—"}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setFeedbackInterview(interview as Interview)}
                    >
                      Feedback
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {feedbackInterview && (
        <InterviewFeedbackForm
          interview={feedbackInterview}
          open={feedbackInterview !== null}
          onOpenChange={(open) => { if (!open) setFeedbackInterview(null); }}
        />
      )}
    </PageWrapper>
  );
}
