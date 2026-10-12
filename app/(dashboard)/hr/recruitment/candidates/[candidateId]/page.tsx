"use client";
import { getErrorMessage } from "@/lib/get-error-message";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  useCandidate,
  useUpdateCandidate,
  useCreateInterview,
  useGenerateCandidateAiScore,
} from "@/lib/api/hooks/hr";
import type { AiScoreResult } from "@/lib/api/hooks/hr";
import { useOrgMembers } from "@/lib/api/hooks/organization";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageBackButton } from "@/components/ui/page-back-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { AlertTriangle, Briefcase, Calendar as CalendarIcon, ClipboardCheck, FileSignature, FileText } from "lucide-react";
import { DetailLayout } from "@/components/shared/detail-header";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { EmptyPersonIllustration } from "@/components/illustrations";
import { COLUMNS } from "@/features/hr/recruitment/kanban/types";
import type { CandidateStatus } from "@/types/hr";
import { ResumeCard } from "@/features/hr/recruitment/candidate-detail/resume-card";
import { ReferenceChecksTab } from "@/features/hr/recruitment/candidate-detail/reference-checks-tab";
import { OffersTab } from "@/features/hr/recruitment/candidate-detail/offers-tab";
import { CandidateProfileCard, type EducationEntry } from "./_components/candidate-profile-card";
import { AiScoreCard } from "./_components/ai-score-card";
import { ApplicationsTab } from "./_components/applications-tab";
import { InterviewsTab } from "./_components/interviews-tab";
import { ScheduleInterviewSheet } from "./_components/candidate-sheets";
import {
  formatToInterviewType,
  type InterviewFormat,
  validateInterviewFormatFields,
} from "@/lib/constants/interview-format";

export default function CandidateDetailPage() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const id = Number(candidateId);
  const { data: session } = useSession();
  const { data: candidate, isLoading, isError, error, refetch } = useCandidate(id);
  const updateCandidate = useUpdateCandidate();
  const createInterview = useCreateInterview();
  const generateAiScore = useGenerateCandidateAiScore();
  const { data: membersData } = useOrgMembers(1, 50, undefined, { roles: ["CEO", "HR", "ADMIN"] });

  const [interviewOpen, setInterviewOpen] = useState(false);
  const [interviewFormat, setInterviewFormat] = useState<InterviewFormat>("VIDEO");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [meetingLink, setMeetingLink] = useState("");
  const [location, setLocation] = useState("");
  const [interviewerId, setInterviewerId] = useState(session?.user?.id ?? "");
  const [applicationId, setApplicationId] = useState("none");

  useEffect(() => {
    if (session?.user?.id && !interviewerId) {
      setInterviewerId(session.user.id);
    }
  }, [session?.user?.id]);

  const [latestAiScore, setLatestAiScore] = useState<AiScoreResult | null>(
    null,
  );
  const handleStatusChange = useCallback(
    (status: CandidateStatus) => {
      updateCandidate.mutate(
        { id, status },
        {
          onSuccess: () => toast.success("Status updated"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [id, updateCandidate],
  );

  const handleScheduleInterview = useCallback(() => {
    if (!scheduledAt) {
      toast.error("Date is required");
      return;
    }
    const when = new Date(scheduledAt);
    if (Number.isNaN(when.getTime())) {
      toast.error("Enter a valid date and time");
      return;
    }
    if (when.getTime() < Date.now()) {
      toast.error("Interview can't be scheduled in the past");
      return;
    }
    const durationMinutes = Number(duration);
    if (!Number.isFinite(durationMinutes) || durationMinutes < 15 || durationMinutes > 480) {
      toast.error("Duration must be between 15 and 480 minutes");
      return;
    }
    const formatError = validateInterviewFormatFields(interviewFormat, meetingLink, location);
    if (formatError) {
      toast.error(formatError);
      return;
    }
    const effectiveInterviewerId = interviewerId || session?.user?.id || "";
    if (!effectiveInterviewerId) {
      toast.error("Please select an interviewer");
      return;
    }
    createInterview.mutate(
      {
        candidateId: id,
        type: formatToInterviewType(interviewFormat),
        scheduledAt: when.toISOString(),
        duration: durationMinutes,
        meetingLink: meetingLink || undefined,
        location: location || undefined,
        interviewerId: effectiveInterviewerId,
        ...(applicationId !== "none" ? { applicationId: Number(applicationId) } : {}),
      },
      {
        onSuccess: () => {
          toast.success("Interview scheduled");
          setInterviewOpen(false);
          setScheduledAt("");
          setMeetingLink("");
          setLocation("");
          setApplicationId("none");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [id, interviewFormat, scheduledAt, duration, meetingLink, location, interviewerId, applicationId, createInterview, session?.user?.id]);

  const handleGenerateAiScore = useCallback(() => {
    generateAiScore.mutate(id, {
      onSuccess: (data) => {
        setLatestAiScore(data);
        toast.success(`AI Score generated: ${data.overall}/100`);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [id, generateAiScore]);

  const handleInterviewOpen = useCallback(() => setInterviewOpen(true), []);

  const displayAiScore =
    latestAiScore ??
    (candidate?.aiScore != null && candidate.aiScoreBreakdown
      ? {
          overall: candidate.aiScore,
          breakdown:
            candidate.aiScoreBreakdown as unknown as AiScoreResult["breakdown"],
          summary: "",
        }
      : null);


  if (isLoading) {
    return (
      <PageWrapper
        title="Candidate"
        subtitle="Loading..."
        actions={<PageBackButton fallback="/hr/recruitment/candidates" showIcon />}
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]" aria-busy="true">
          <div className="space-y-4">
            <Skeleton className="h-9 w-96 max-w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="order-first space-y-4 lg:order-none">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isError && !candidate) {
    return (
      <PageWrapper
        title="Candidate"
        actions={<PageBackButton fallback="/hr/recruitment/candidates" showIcon />}
      >
        <QueryErrorState error={error} onRetry={() => refetch()} />
      </PageWrapper>
    );
  }

  if (!candidate) {
    return (
      <PageWrapper
        title="Not Found"
        subtitle="Candidate not found"
        actions={<PageBackButton fallback="/hr/recruitment/candidates" label="Back to Candidates" />}
      >
        <EmptyState
          illustration={<EmptyPersonIllustration className="size-32" />}
          title="Candidate not found"
        />
      </PageWrapper>
    );
  }

  const candidateExtras = candidate as typeof candidate & {
    alternatePhone?: string | null;
    relevantExperienceMonths?: number | null;
    location?: string | null;
    preferredLocation?: string | null;
    employmentType?: string | null;
    currentEmploymentStatus?: string | null;
    preferredWorkMode?: string | null;
    workAuthorization?: string | null;
    willingToRelocate?: boolean | null;
    noticePeriodDays?: number | null;
    availableFrom?: string | null;
    currentCtc?: string | number | null;
    expectedCtc?: string | number | null;
    salaryCurrency?: string | null;
    githubUrl?: string | null;
    education?: EducationEntry[] | null;
  };

  return (
    <PageWrapper
      title={`${candidate.firstName} ${candidate.lastName}`}
      subtitle={
        <span className="inline-flex flex-wrap items-center gap-2">
          {candidate.currentRole && (
            <span>{`${candidate.currentRole}${candidate.currentCompany ? ` at ${candidate.currentCompany}` : ""}`}</span>
          )}
          {candidate.status && (
            <StatusPill tone={COLUMNS.find((c) => c.id === candidate.status)?.tone ?? "neutral"} dot>
              {candidate.status}
            </StatusPill>
          )}
        </span>
      }
      stickyHeader
      actions={
        <div className="flex items-center gap-2">
          <PageBackButton fallback="/hr/recruitment/candidates" showIcon />
          <Button size="sm" onClick={handleInterviewOpen}>
            <CalendarIcon className="size-4" aria-hidden="true" />
            Schedule Interview
          </Button>
        </div>
      }
    >
      {candidate.duplicateOfId != null && (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-lg bg-warning-soft px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-strong" aria-hidden="true" />
          <div className="flex-1">
            <span className="font-medium text-warning-strong">
              Duplicate candidate —{" "}
            </span>
            <span className="text-warning-strong">
              This profile was identified as a duplicate of{" "}
              <Link
                href={`/hr/recruitment/candidates/${candidate.duplicateOfId}`}
                className="rounded-sm font-medium underline underline-offset-2 outline-none hover:no-underline focus-visible:focus-ring"
              >
                Candidate #{candidate.duplicateOfId}
              </Link>
              . Review and merge if needed.
            </span>
          </div>
        </div>
      )}

      <DetailLayout
        main={
          <Tabs defaultValue="applications" className="flex min-h-0 flex-col">
            <TabsList variant="underline" className="mb-4 w-full justify-start overflow-x-auto">
              <TabsTrigger value="applications">
                <Briefcase className="size-4" aria-hidden="true" />
                Applications
              </TabsTrigger>
              <TabsTrigger value="interviews">
                <CalendarIcon className="size-4" aria-hidden="true" />
                Interviews
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="size-4" aria-hidden="true" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="references">
                <ClipboardCheck className="size-4" aria-hidden="true" />
                References
              </TabsTrigger>
              <TabsTrigger value="offers">
                <FileSignature className="size-4" aria-hidden="true" />
                Offers
              </TabsTrigger>
            </TabsList>

            <TabsContent value="applications">
              <ApplicationsTab applications={candidate.applications} />
            </TabsContent>

            <TabsContent value="interviews">
              <InterviewsTab
                interviews={candidate.interviews}
                onScheduleOpen={handleInterviewOpen}
              />
            </TabsContent>

            <TabsContent value="documents">
              <ResumeCard
                resumeUrl={candidate.resumeUrl}
                candidateName={`${candidate.firstName} ${candidate.lastName}`}
              />
            </TabsContent>

            <TabsContent value="references">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Reference Checks</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReferenceChecksTab candidateId={id} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="offers">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Offer Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <OffersTab candidateId={id} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        }
        rail={
          <>
            <CandidateProfileCard
              status={candidate.status}
              rating={candidate.rating}
              email={candidate.email}
              phone={candidate.phone}
              alternatePhone={candidateExtras.alternatePhone}
              source={candidate.source}
              experienceYears={candidate.experienceYears}
              relevantExperienceMonths={candidateExtras.relevantExperienceMonths}
              location={candidateExtras.location}
              preferredLocation={candidateExtras.preferredLocation}
              employmentType={candidateExtras.employmentType}
              currentEmploymentStatus={candidateExtras.currentEmploymentStatus}
              preferredWorkMode={candidateExtras.preferredWorkMode}
              workAuthorization={candidateExtras.workAuthorization}
              willingToRelocate={candidateExtras.willingToRelocate}
              noticePeriodDays={candidateExtras.noticePeriodDays}
              availableFrom={candidateExtras.availableFrom}
              currentCtc={candidateExtras.currentCtc}
              expectedCtc={candidateExtras.expectedCtc}
              salaryCurrency={candidateExtras.salaryCurrency}
              linkedinUrl={candidate.linkedinUrl}
              githubUrl={candidateExtras.githubUrl}
              portfolioUrl={candidate.portfolioUrl}
              education={candidateExtras.education}
              skills={candidate.skills}
              onStatusChange={handleStatusChange}
              isUpdating={updateCandidate.isPending}
            />

            <AiScoreCard
              displayAiScore={displayAiScore}
              aiScoreGeneratedAt={candidate.aiScoreGeneratedAt}
              isLatestScore={latestAiScore !== null}
              isPending={generateAiScore.isPending}
              onGenerate={handleGenerateAiScore}
            />

            {candidate.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {candidate.notes}
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        }
      />

      <ScheduleInterviewSheet
        open={interviewOpen}
        onOpenChange={setInterviewOpen}
        format={interviewFormat}
        scheduledAt={scheduledAt}
        duration={duration}
        meetingLink={meetingLink}
        location={location}
        interviewerId={interviewerId || session?.user?.id || ""}
        applicationId={applicationId}
        isPending={createInterview.isPending}
        members={(membersData?.data ?? []).map((m) => ({ id: m.userId, name: m.name, email: m.email, role: m.role }))}
        applications={(candidate?.applications ?? []).map((a) => ({
          id: a.id,
          jobPostingId: a.jobPostingId,
          jobTitle: a.jobPosting?.title ?? `Job #${a.jobPostingId}`,
        }))}
        onFormatChange={setInterviewFormat}
        onScheduledAtChange={setScheduledAt}
        onDurationChange={setDuration}
        onMeetingLinkChange={setMeetingLink}
        onLocationChange={setLocation}
        onInterviewerIdChange={setInterviewerId}
        onApplicationIdChange={setApplicationId}
        onSubmit={handleScheduleInterview}
      />
    </PageWrapper>
  );
}
