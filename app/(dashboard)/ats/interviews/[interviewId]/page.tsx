import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import {
  candidates,
  interviewScorecards,
  interviews,
  jobPostings,
  scorecardTemplates,
  users,
} from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { jobCapabilities } from "@/lib/ats/access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { formatIST } from "@/lib/date-utils";
import { pluralise } from "@/lib/format-utils";
import { ScorecardForm } from "@/features/ats/interviews/scorecard-form";

export const dynamic = "force-dynamic";

/** The criteria a round is scored on, when nobody has defined a template. */
const DEFAULT_CRITERIA = ["Skill for the role", "Problem solving", "Communication", "Ownership"];

/**
 * MIYO-0658: one interview and its scorecards. Other people's scores stay
 * hidden until this interviewer has submitted their own.
 */
export default async function InterviewPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  if (!ATS_MODULE_ENABLED) notFound();

  const authed = await requireAuth();
  if ("error" in authed) notFound();
  const { orgId, userId, member } = authed;

  const interviewId = Number((await params).interviewId);
  if (!Number.isInteger(interviewId)) notFound();

  const interview = await db.query.interviews.findFirst({
    where: and(eq(interviews.id, interviewId), eq(interviews.orgId, orgId)),
  });
  if (!interview) notFound();

  if (interview.jobPostingId) {
    const capabilities = await jobCapabilities({ userId, orgId, role: member.role }, interview.jobPostingId);
    if (!capabilities.has("view")) notFound();
  }

  const [candidate, job, scorecards, template] = await Promise.all([
    db.query.candidates.findFirst({ where: eq(candidates.id, interview.candidateId) }),
    interview.jobPostingId
      ? db.query.jobPostings.findFirst({ where: eq(jobPostings.id, interview.jobPostingId) })
      : null,
    db
      .select({
        id: interviewScorecards.id,
        interviewerId: interviewScorecards.interviewerId,
        interviewerName: users.name,
        ratings: interviewScorecards.ratings,
        recommendation: interviewScorecards.recommendation,
        notes: interviewScorecards.notes,
        submittedAt: interviewScorecards.submittedAt,
      })
      .from(interviewScorecards)
      .leftJoin(users, eq(users.id, interviewScorecards.interviewerId))
      .where(eq(interviewScorecards.interviewId, interviewId)),
    db.query.scorecardTemplates.findFirst({
      where: and(eq(scorecardTemplates.orgId, orgId), eq(scorecardTemplates.isActive, true)),
    }),
  ]);
  if (!candidate) notFound();

  const mine = scorecards.find((s) => s.interviewerId === userId);
  const others = scorecards.filter((s) => s.interviewerId !== userId);
  const criteria = template?.criteria?.length
    ? template.criteria.map((c) => c.name)
    : DEFAULT_CRITERIA;

  return (
    <PageWrapper
      title={`${candidate.firstName} ${candidate.lastName}`}
      subtitle={[
        job?.title,
        interview.type,
        `${formatIST(interview.scheduledAt, {
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        })} IST`,
        `${interview.duration ?? 60} minutes`,
      ]
        .filter(Boolean)
        .join(" · ")}
    >
      <p className="mb-6 text-sm text-muted-foreground">
        <Link
          href={`/ats/candidates/${candidate.id}`}
          className="underline underline-offset-4"
        >
          Open the candidate
        </Link>
        {interview.meetingUrl && (
          <>
            {" · "}
            <a href={interview.meetingUrl} className="underline underline-offset-4">
              Join the meeting
            </a>
          </>
        )}
      </p>

      <h2 className="mb-3 text-base font-medium text-foreground">Your scorecard</h2>
      <ScorecardForm
        interviewId={interviewId}
        criteria={criteria}
        initial={
          mine
            ? {
                ratings: mine.ratings,
                recommendation: mine.recommendation,
                notes: mine.notes,
              }
            : undefined
        }
      />

      <h2 className="mt-10 mb-3 text-base font-medium text-foreground">The rest of the panel</h2>
      {!mine?.submittedAt ? (
        <p className="text-sm text-muted-foreground">
          {others.length === 0
            ? "Nobody else has scored this round yet."
            : `${pluralise(others.length, "scorecard")} waiting. They open once you submit yours.`}
        </p>
      ) : others.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nobody else has scored this round yet.</p>
      ) : (
        <div className="grid gap-3">
          {others.map((scorecard) => (
            <Card key={scorecard.id}>
              <CardContent className="p-5 text-sm">
                <p className="font-medium text-foreground">
                  {scorecard.interviewerName ?? "An interviewer"} · {scorecard.recommendation}
                </p>
                {scorecard.notes && (
                  <p className="mt-1 text-muted-foreground">{scorecard.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
