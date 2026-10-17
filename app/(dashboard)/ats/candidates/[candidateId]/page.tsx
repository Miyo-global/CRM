import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";

import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import {
  atsActivity,
  atsCandidateNotes,
  atsEmailLog,
  candidateApplications,
  candidateOffers,
  candidates,
  organizationMembers,
  interviews,
  jobPostings,
  users,
} from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { atsPageAccess } from "@/lib/ats/page-access";
import { isAtsRole, ROLES } from "@/lib/constants/roles";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatIST } from "@/lib/date-utils";
import { getResumePreviewSrc } from "@/lib/files/resume-preview-url";
import { ScheduleInterviewDialog } from "@/features/ats/interviews/schedule-interview-dialog";
import { CandidatePrivacyActions } from "@/features/ats/candidates/candidate-privacy-actions";

export const dynamic = "force-dynamic";

function when(value: Date | null | undefined): string {
  return value
    ? `${formatIST(value, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} IST`
    : "—";
}

/**
 * MIYO-0645: one candidate. Offers are money, so the tab only appears for
 * somebody who may see them — an interviewer never does.
 */
export default async function CandidateProfilePage({
  params,
}: {
  params: Promise<{ candidateId: string }>;
}) {
  if (!ATS_MODULE_ENABLED) notFound();

  const authed = await requireAuth();
  if ("error" in authed) notFound();
  const { orgId, userId, member } = authed;
  const { allowed, jobIds: allowedJobIds } = await atsPageAccess({
    userId,
    orgId,
    role: member.role,
  });
  if (!allowed) notFound();

  const candidateId = Number((await params).candidateId);
  if (!Number.isInteger(candidateId)) notFound();

  const candidate = await db.query.candidates.findFirst({
    where: and(eq(candidates.id, candidateId), eq(candidates.orgId, orgId)),
  });
  if (!candidate) notFound();

  const applications = await db
    .select({
      id: candidateApplications.id,
      jobId: jobPostings.id,
      jobTitle: jobPostings.title,
      status: candidateApplications.status,
      appliedAt: candidateApplications.appliedAt,
      rating: candidateApplications.rating,
    })
    .from(candidateApplications)
    .innerJoin(jobPostings, eq(jobPostings.id, candidateApplications.jobPostingId))
    .where(eq(candidateApplications.candidateId, candidateId))
    .orderBy(desc(candidateApplications.appliedAt));

  // Someone seated on particular jobs only sees a candidate who applied to one.
  if (allowedJobIds && !applications.some((a) => allowedJobIds.includes(a.jobId))) {
    notFound();
  }

  // Offers are money. Only the org-wide ATS roles see them; a hiring
  // manager or an interviewer seated on the job does not.
  const maySeeOffers = isAtsRole(member.role);
  // Erasure is HR's and the admins', never a recruiter's.
  const canErase = member.role === ROLES.CEO || member.role === ROLES.HR || member.role === ROLES.ADMIN;

  const [interviewRows, notes, activity, emails, offers] = await Promise.all([
    db
      .select({
        id: interviews.id,
        type: interviews.type,
        scheduledAt: interviews.scheduledAt,
        result: interviews.result,
        rating: interviews.rating,
        interviewerName: users.name,
      })
      .from(interviews)
      .leftJoin(users, eq(users.id, interviews.interviewerId))
      .where(eq(interviews.candidateId, candidateId))
      .orderBy(desc(interviews.scheduledAt)),
    db
      .select({
        id: atsCandidateNotes.id,
        body: atsCandidateNotes.body,
        createdAt: atsCandidateNotes.createdAt,
        authorName: users.name,
      })
      .from(atsCandidateNotes)
      .leftJoin(users, eq(users.id, atsCandidateNotes.authorId))
      .where(eq(atsCandidateNotes.candidateId, candidateId))
      .orderBy(desc(atsCandidateNotes.createdAt)),
    db
      .select({
        id: atsActivity.id,
        type: atsActivity.type,
        createdAt: atsActivity.createdAt,
        actorName: users.name,
      })
      .from(atsActivity)
      .leftJoin(users, eq(users.id, atsActivity.actorId))
      .where(eq(atsActivity.candidateId, candidateId))
      .orderBy(desc(atsActivity.createdAt))
      .limit(50),
    db
      .select({
        id: atsEmailLog.id,
        templateId: atsEmailLog.templateId,
        subject: atsEmailLog.subject,
        sentAt: atsEmailLog.sentAt,
        status: atsEmailLog.status,
      })
      .from(atsEmailLog)
      .where(eq(atsEmailLog.candidateId, candidateId))
      .orderBy(desc(atsEmailLog.sentAt)),
    maySeeOffers
      ? db
          .select({
            id: candidateOffers.id,
            status: candidateOffers.offerStatus,
            designation: candidateOffers.offeredDesignation,
            joiningDate: candidateOffers.joiningDate,
            sentAt: candidateOffers.sentAt,
          })
          .from(candidateOffers)
          .where(eq(candidateOffers.candidateId, candidateId))
          .orderBy(desc(candidateOffers.id))
      : Promise.resolve([]),
  ]);

  // Who can be put on an interview panel.
  const people = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(and(eq(organizationMembers.orgId, orgId), eq(users.isActive, true)));

  const contact = [candidate.email, candidate.phone, candidate.location]
    .filter(Boolean)
    .join(" · ");

  return (
    <PageWrapper
      title={`${candidate.firstName} ${candidate.lastName}`}
      subtitle={contact}
      actions={
        maySeeOffers ? (
          <CandidatePrivacyActions candidateId={candidate.id} canErase={canErase} />
        ) : undefined
      }
    >
      {candidate.duplicateOfId && (
        <Card className="mb-4">
          <CardContent className="p-5 text-sm">
            <p className="font-medium text-foreground">Possible duplicate</p>
            <p className="mt-1 text-muted-foreground">
              A phone number or LinkedIn profile matches{" "}
              <Link
                href={`/ats/candidates/${candidate.duplicateOfId}`}
                className="underline underline-offset-4"
              >
                another candidate
              </Link>
              . Check before you reply twice.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="resume">Resume</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="interviews">Interviews</TabsTrigger>
          {maySeeOffers && <TabsTrigger value="offers">Offers</TabsTrigger>}
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="emails">Emails</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="grid gap-3 p-5 text-sm">
              {[
                ["Email", candidate.email],
                ["Phone", candidate.phone ?? "—"],
                ["LinkedIn", candidate.linkedinUrl ?? "—"],
                ["Source", candidate.source ?? "—"],
                ["Current company", candidate.currentCompany ?? "—"],
                ["Applied", when(candidate.createdAt)],
              ].map(([label, value]) => (
                <div key={label} className="grid gap-1 sm:grid-cols-[180px_1fr]">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resume">
          {candidate.resumeUrl ? (
            <iframe
              src={getResumePreviewSrc(candidate.resumeUrl)}
              title="Resume"
              className="h-[800px] w-full rounded-md border border-border"
            />
          ) : (
            <p className="py-6 text-sm text-muted-foreground">No resume on file.</p>
          )}
        </TabsContent>

        <TabsContent value="applications">
          <ul className="grid gap-2 py-2 text-sm">
            {applications.map((application) => (
              <li key={application.id} className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Link
                  href={`/ats/jobs/${application.jobId}/pipeline`}
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  {application.jobTitle}
                </Link>
                <span className="text-muted-foreground">{application.status}</span>
                <span className="text-muted-foreground">{when(application.appliedAt)}</span>
                <ScheduleInterviewDialog
                  applicationId={application.id}
                  jobTitle={application.jobTitle}
                  people={people.map((p) => ({ id: p.id, name: p.name ?? p.email }))}
                />
                {maySeeOffers && (
                  <Link
                    href={`/hr/onboarding?application=${application.id}`}
                    className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Hire
                  </Link>
                )}
              </li>
            ))}
            {applications.length === 0 && (
              <li className="text-muted-foreground">No applications.</li>
            )}
          </ul>
        </TabsContent>

        <TabsContent value="interviews">
          <ul className="grid gap-2 py-2 text-sm">
            {interviewRows.map((row) => (
              <li key={row.id} className="flex flex-wrap gap-x-3">
                <span className="text-foreground">{row.type}</span>
                <span className="text-muted-foreground">{when(row.scheduledAt)}</span>
                <span className="text-muted-foreground">{row.interviewerName ?? "—"}</span>
                <span className="text-muted-foreground">{row.result}</span>
              </li>
            ))}
            {interviewRows.length === 0 && (
              <li className="text-muted-foreground">No interviews yet.</li>
            )}
          </ul>
        </TabsContent>

        {maySeeOffers && (
          <TabsContent value="offers">
            <ul className="grid gap-2 py-2 text-sm">
              {offers.map((offer) => (
                <li key={offer.id} className="flex flex-wrap gap-x-3">
                  <span className="text-foreground">{offer.designation ?? "Offer"}</span>
                  <span className="text-muted-foreground">{offer.status}</span>
                  <span className="text-muted-foreground">
                    {offer.joiningDate ? `joins ${offer.joiningDate}` : ""}
                  </span>
                </li>
              ))}
              {offers.length === 0 && <li className="text-muted-foreground">No offers.</li>}
            </ul>
          </TabsContent>
        )}

        <TabsContent value="notes">
          <ul className="grid gap-3 py-2 text-sm">
            {notes.map((note) => (
              <li key={note.id}>
                <p className="text-foreground">{note.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {note.authorName ?? "Someone"} · {when(note.createdAt)}
                </p>
              </li>
            ))}
            {notes.length === 0 && <li className="text-muted-foreground">No notes yet.</li>}
          </ul>
        </TabsContent>

        <TabsContent value="emails">
          <ul className="grid gap-2 py-2 text-sm">
            {emails.map((email) => (
              <li key={email.id} className="flex flex-wrap gap-x-3">
                <span className="text-foreground">{email.subject ?? email.templateId}</span>
                <span className="text-muted-foreground">{when(email.sentAt)}</span>
                <span className="text-muted-foreground">{email.status}</span>
              </li>
            ))}
            {emails.length === 0 && (
              <li className="text-muted-foreground">Nothing sent yet.</li>
            )}
          </ul>
        </TabsContent>

        <TabsContent value="activity">
          <ul className="grid gap-2 py-2 text-sm">
            {activity.map((entry) => (
              <li key={entry.id} className="flex flex-wrap gap-x-3">
                <span className="text-foreground">{entry.type.replace(/_/g, " ")}</span>
                <span className="text-muted-foreground">{entry.actorName ?? "System"}</span>
                <span className="text-muted-foreground">{when(entry.createdAt)}</span>
              </li>
            ))}
            {activity.length === 0 && (
              <li className="text-muted-foreground">Nothing recorded yet.</li>
            )}
          </ul>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
