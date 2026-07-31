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
import { UserPlus } from "lucide-react";
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

  const { data: pipeline, isLoading: globalLoading } = useAtsKanban();
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
      actions={
        <div className="flex items-center gap-2">
          <Select
            value={selectedJobId ? String(selectedJobId) : "all"}
            onValueChange={(v) => setSelectedJobId(v === "all" ? null : Number(v))}
          >
            <SelectTrigger className="h-8 w-52 text-xs">
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
            <Badge variant="outline" className="text-[10px] h-7">Flow</Badge>
          )}
          <PageBackButton fallback="/hr/recruitment" showIcon />
          <Button size="sm" asChild>
            <Link href="/hr/recruitment/candidates/new">
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />New Candidate
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
        <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
          {jobLoading ? "Loading…" : "This job has no hiring flow. Assign one to see dynamic stages."}
        </div>
      ) : (
        <PipelineKanban
          stages={pipeline?.stages ?? []}
          onStageChange={handleGlobalStageChange}
          isLoading={globalLoading}
          isPending={updateStage.isPending}
        />
      )}

      <Sheet open={!!schedulingTarget} onOpenChange={(v) => !v && setSchedulingTarget(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">
              Schedule Interview — {schedulingTarget?.roundLabel}
            </SheetTitle>
          </SheetHeader>
          {schedulingTarget && (
            <div className="py-4 space-y-4">
              <div className="rounded-md border bg-muted/30 px-3 py-2 space-y-0.5">
                <p className="text-xs font-medium">{schedulingTarget.candidate.name}</p>
                <p className="text-[10px] text-muted-foreground">{schedulingTarget.candidate.email}</p>
                <p className="text-[10px] text-muted-foreground">
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
                    <span className="ml-1 text-[10px] text-muted-foreground">(HR only)</span>
                  )}
                </Label>
                {(() => {
                  const HR_ROLES = ["HR", "BRANCH_HR"];
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
                          <svg className="h-4 w-4 opacity-50 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4M8 15l4 4 4-4" /></svg>
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
                                  <span className="ml-1 text-[10px] text-muted-foreground">({e.role})</span>
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
            <Button onClick={handleSchedule} disabled={!scheduledAt || scheduling}>
              {scheduling ? "Scheduling…" : "Schedule"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
