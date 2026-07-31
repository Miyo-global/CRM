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
const Briefcase = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="7" width="20" height="14" rx="2" /><path strokeLinecap="round" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /></svg>
);
const CalendarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" /><path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" /></svg>
);
const FileText = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
);
const ClipboardCheck = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
);
const FileSignature = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
);
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
  const { data: candidate, isLoading } = useCandidate(id);
  const updateCandidate = useUpdateCandidate();
  const createInterview = useCreateInterview();
  const generateAiScore = useGenerateCandidateAiScore();
  const { data: membersData } = useOrgMembers(1, 50, undefined, { roles: ["CEO", "HR", "ADMIN", "BRANCH_HR"] });

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
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
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
        <div />
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
        candidate.currentRole
          ? `${candidate.currentRole}${candidate.currentCompany ? ` at ${candidate.currentCompany}` : ""}`
          : undefined
      }
      stickyHeader
      actions={
        <div className="flex items-center gap-2">
          <PageBackButton fallback="/hr/recruitment/candidates" showIcon />
          <Button size="sm" onClick={handleInterviewOpen}>
            Schedule Interview
          </Button>
        </div>
      }
    >
      {candidate.duplicateOfId != null && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 mb-4 text-sm">
          <span
            className="text-amber-600 dark:text-amber-400 mt-0.5"
            aria-hidden="true"
          >
            ⚠
          </span>
          <div className="flex-1">
            <span className="font-medium text-amber-800 dark:text-amber-300">
              Duplicate candidate —{" "}
            </span>
            <span className="text-amber-700 dark:text-amber-400">
              This profile was identified as a duplicate of{" "}
              <Link
                href={`/hr/recruitment/candidates/${candidate.duplicateOfId}`}
                className="underline underline-offset-2 hover:no-underline"
              >
                Candidate #{candidate.duplicateOfId}
              </Link>
              . Review and merge if needed.
            </span>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
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
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-medium">Notes</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {candidate.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="applications" className="flex min-h-0 flex-col">
            <TabsList className="sticky top-0 z-10 mb-4 w-full justify-start overflow-x-auto bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
              <TabsTrigger value="applications">
                <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                Applications
              </TabsTrigger>
              <TabsTrigger value="interviews">
                <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                Interviews
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="references">
                <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />
                References
              </TabsTrigger>
              <TabsTrigger value="offers">
                <FileSignature className="h-3.5 w-3.5 mr-1.5" />
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
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm">Reference Checks</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <ReferenceChecksTab candidateId={id} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="offers">
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm">Offer Tracking</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <OffersTab candidateId={id} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

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
