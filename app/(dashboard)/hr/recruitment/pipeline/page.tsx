"use client";

import { useState, useCallback } from "react";
import { getErrorMessage } from "@/lib/get-error-message";
import { FutureDatetimeInput } from "@/components/ui/future-datetime-input";
import { isPastDatetimeLocal } from "@/lib/date-utils";
import { useAtsKanban, useUpdateCandidateStage, useHrEmployees, isPaginatedEmployees } from "@/lib/api/hooks/hr";
import { useJobPostings } from "@/lib/api/hooks/hr";
import {
  useJobPipeline,
  useUpdateApplicationPipelineStage,
  useScheduleInterview,
} from "@/lib/api/hooks/hr/recruitment";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageBackButton } from "@/components/ui/page-back-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PipelineKanban } from "@/components/hr/recruitment/pipeline-kanban";
import { JobPipelineKanban } from "@/components/hr/recruitment/job-pipeline-kanban";
import { InterviewFormatFields } from "@/components/hr/recruitment/interview-format-fields";
import {
  type InterviewFormat,
  normalizeInterviewFormat,
  validateInterviewFormatFields,
} from "@/lib/constants/interview-format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import Link from "next/link";
import { ChevronsUpDown, UserPlus, Workflow } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import type { CandidateStatus, JobPipelineCandidate } from "@/types/hr";

interface SchedulingTarget {
  candidate: JobPipelineCandidate;
  stage: string;
  roundLabel: string;
  roundNumber: number;
  durationMinutes: number;
  mode: string;
  roundType: string;
}

export default function PipelinePage() {
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [schedulingTarget, setSchedulingTarget] = useState<SchedulingTarget | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [format, setFormat] = useState<InterviewFormat>("VIDEO");
  const [meetingLink, setMeetingLink] = useState("");
  const [location, setLocation] = useState("");
  const [interviewerId, setInterviewerId] = useState("");
  const [interviewerOpen, setInterviewerOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  const { data: pipeline, isLoading: globalLoading, isError: globalError, error: globalErrorObj, refetch: refetchGlobal } = useAtsKanban();
  const { data: jobs } = useJobPostings({ status: "OPEN" });
  const { data: jobPipeline, isLoading: jobLoading } = useJobPipeline(selectedJobId);
  const { data: employeesRaw } = useHrEmployees();
  const employees = employeesRaw ? (isPaginatedEmployees(employeesRaw) ? employeesRaw.data : employeesRaw) : [];

  const updateStage = useUpdateCandidateStage();
  const updateAppStage = useUpdateApplicationPipelineStage(selectedJobId ?? 0);
  const scheduleInterview = useScheduleInterview();

  const handleGlobalStageChange = useCallback(
    (candidateId: number, newStage: CandidateStatus, sendEmail = false) => {
      updateStage.mutate(
        { candidateId, stage: newStage, sendEmail },
        {
          onSuccess: (res) => { if (res.changed) toast.success(`Moved to ${newStage}`); },
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    },
    [updateStage]
  );

  const handleAppStageChange = useCallback(
    (applicationId: number, newStage: string, sendEmail = false) => {
      updateAppStage.mutate(
        { applicationId, stage: newStage, sendEmail },
        {
          onSuccess: () => toast.success(`Moved to ${newStage}`),
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    },
    [updateAppStage]
  );

  const handleRoundEntry = useCallback(
    (candidate: JobPipelineCandidate, stage: string) => {
      const roundNumber = Number(stage.replace("ROUND_", ""));
      const flow = jobPipeline?.hiringFlow;
      const round = flow?.rounds.find((r) => r.roundOrder === roundNumber);
      setSchedulingTarget({
        candidate,
        stage,
        roundLabel: round?.name ?? `Round ${roundNumber}`,
        roundNumber,
        durationMinutes: round?.durationMinutes ?? 60,
        mode: round?.mode ?? "VIDEO",
        roundType: round?.type ?? "CUSTOM",
      });
      setScheduledAt("");
      setNotes("");
      setFormat(normalizeInterviewFormat(round?.mode ?? "VIDEO"));
      setMeetingLink("");
      setLocation("");
      setInterviewerId("");
      setInterviewerOpen(false);
    },
    [jobPipeline]
  );

  async function handleSchedule() {
    if (!schedulingTarget || !scheduledAt) {
      toast.error("Please pick a date and time.");
      return;
    }
    if (isPastDatetimeLocal(scheduledAt)) {
      toast.error("Interview cannot be scheduled in the past");
      return;
    }
    const formatError = validateInterviewFormatFields(format, meetingLink, location);
    if (formatError) {
      toast.error(formatError);
      return;
    }
    setScheduling(true);
    try {
      await scheduleInterview.mutateAsync({
        candidateId: schedulingTarget.candidate.candidateId,
        jobPostingId: selectedJobId ?? undefined,
        scheduledAt,
        durationMinutes: schedulingTarget.durationMinutes,
        format,
        meetingLink: meetingLink || undefined,
        location: location || undefined,
        interviewers: interviewerId ? [interviewerId] : [],
        notes: notes || undefined,
        notifyChannels: { email: true, whatsapp: false },
      });
      toast.success("Interview scheduled.");
      setSchedulingTarget(null);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setScheduling(false);
    }
  }

  const isJobView = selectedJobId !== null;
  const showDynamic = isJobView && !!jobPipeline?.hiringFlow;

  return (
    <PageWrapper
      title="Recruitment Pipeline"
      subtitle={
        isJobView && jobPipeline?.job
          ? `Viewing: ${jobPipeline.job.title}${jobPipeline.hiringFlow ? ` · ${jobPipeline.hiringFlow.name}` : ""}`
          : "Drag candidates between stages to update their status"
      }
      noInternalScroll
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={selectedJobId ? String(selectedJobId) : "all"}
            onValueChange={(v) => setSelectedJobId(v === "all" ? null : Number(v))}
          >
            <SelectTrigger className="h-8 w-full text-sm sm:w-60" aria-label="Filter by job">
              <SelectValue placeholder="All candidates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All candidates</SelectItem>
              {jobs?.map((j) => (
                <SelectItem key={j.id} value={String(j.id)} className="text-xs">
                  {j.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showDynamic && (
            <Badge>Flow</Badge>
          )}
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          <PageBackButton fallback="/hr/recruitment" showIcon />
          <Button size="sm" asChild>
            <Link href="/hr/recruitment/candidates/new">
              <UserPlus className="size-4" aria-hidden="true" />New Candidate
            </Link>
          </Button>
        </div>
      }
    >
      {showDynamic ? (
        <JobPipelineKanban
          stages={jobPipeline!.stages}
          onStageChange={handleAppStageChange}
          onRoundEntry={handleRoundEntry}
          isPending={updateAppStage.isPending}
        />
      ) : isJobView ? (
        jobLoading ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground" aria-busy="true">
            Loading…
          </div>
        ) : (
          <EmptyState
            icon={Workflow}
            title="No hiring flow"
            description="This job has no hiring flow. Assign one to see dynamic stages."
            action={{ label: "Hiring Flows", href: "/hr/recruitment/hiring-flows" }}
          />
        )
      ) : globalError ? (
        <QueryErrorState error={globalErrorObj} onRetry={() => refetchGlobal()} />
      ) : (
        <PipelineKanban
          stages={pipeline?.stages ?? []}
          onStageChange={handleGlobalStageChange}
          isLoading={globalLoading}
          isPending={updateStage.isPending}
        />
      )}

      <Sheet open={!!schedulingTarget} onOpenChange={(v) => !v && setSchedulingTarget(null)}>
        <SheetContent size="md" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Schedule Interview — {schedulingTarget?.roundLabel}
            </SheetTitle>
          </SheetHeader>
          {schedulingTarget && (
            <div className="space-y-4 px-4 py-4">
              <div className="space-y-0.5 rounded-lg border border-border bg-surface-sunken px-3 py-2.5">
                <p className="text-sm font-medium">{schedulingTarget.candidate.name}</p>
                <p className="text-xs text-muted-foreground">{schedulingTarget.candidate.email}</p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {schedulingTarget.roundLabel} · {schedulingTarget.durationMinutes} min · {schedulingTarget.mode}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date & Time <span className="text-destructive">*</span></Label>
                <FutureDatetimeInput
                  active={!!schedulingTarget}
                  value={scheduledAt}
                  onChange={setScheduledAt}
                  pastMessage="Interview cannot be scheduled in the past"
                  className="text-sm"
                />
              </div>

              <InterviewFormatFields
                format={format}
                onFormatChange={setFormat}
                meetingLink={meetingLink}
                onMeetingLinkChange={setMeetingLink}
                location={location}
                onLocationChange={setLocation}
              />

              <div className="space-y-1.5">
                <Label className="text-xs">
                  Interviewer
                  {schedulingTarget.roundType === "HR_SCREENING" && (
                    <span className="ml-1 text-2xs text-muted-foreground">(HR only)</span>
                  )}
                </Label>
                {(() => {
                  const HR_ROLES = ["HR"];
                  const pool = schedulingTarget.roundType === "HR_SCREENING"
                    ? employees.filter((e) => HR_ROLES.includes(e.role))
                    : employees;
                  const selectedName = interviewerId
                    ? pool.find((e) => e.id === interviewerId) ?? employees.find((e) => e.id === interviewerId)
                    : null;
                  return (
                    <Popover open={interviewerOpen} onOpenChange={setInterviewerOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between text-sm font-normal h-9">
                          {selectedName
                            ? `${selectedName.firstName ?? ""} ${selectedName.lastName ?? ""}`.trim()
                            : <span className="text-muted-foreground">Select interviewer (optional)</span>}
                          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0" align="start">
                        <Command className="flex h-auto max-h-[min(300px,70vh)] min-h-0 w-full flex-col overflow-hidden">
                          <CommandInput placeholder="Search interviewer..." className="h-9 shrink-0 text-sm" />
                          <CommandList
                            className="max-h-[min(240px,60vh)] min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
                            onWheel={(e) => e.stopPropagation()}
                          >
                            <CommandEmpty>No match found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem value="none" onSelect={() => { setInterviewerId(""); setInterviewerOpen(false); }} className="text-xs text-muted-foreground">
                                No interviewer assigned
                              </CommandItem>
                              {pool.map((e) => (
                                <CommandItem
                                  key={e.id}
                                  value={`${e.firstName ?? ""} ${e.lastName ?? ""}`.trim()}
                                  onSelect={() => { setInterviewerId(e.id); setInterviewerOpen(false); }}
                                  className="text-sm"
                                >
                                  {e.firstName} {e.lastName}
                                  <span className="ml-1 text-2xs text-muted-foreground">({e.role})</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  );
                })()}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  placeholder="Any prep notes or instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="resize-none text-sm"
                  rows={3}
                />
              </div>
            </div>
          )}
          <SheetFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setSchedulingTarget(null)} disabled={scheduling}>
              Skip
            </Button>
            <Button onClick={handleSchedule} disabled={!scheduledAt} loading={scheduling}>
              {scheduling ? "Scheduling…" : "Schedule"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
