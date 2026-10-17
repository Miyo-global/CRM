import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { withAuth, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  atsActivity,
  atsCandidateNotes,
  atsConsents,
  atsEmailLog,
  candidateApplications,
  candidates,
  interviews,
  jobPostings,
} from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { isAtsRole } from "@/lib/constants/roles";
import { createAuditLog } from "@/lib/audit-log";
import { getFileUrl } from "@/lib/storage";
import { logger } from "@/lib/logger";

/**
 * MIYO-0680: everything held about one candidate, as JSON. The resume is a
 * signed link rather than bytes in the payload, so the file itself is not
 * copied into a download that may be emailed on.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> },
) {
  return withAuth(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    if (!isAtsRole(session.user.role)) return err("Forbidden", 403);

    const candidateId = Number((await params).candidateId);
    if (!Number.isInteger(candidateId)) return err("Invalid candidate ID.", 400);

    const candidate = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
    });
    if (!candidate) return err("Candidate not found.", 404);

    const [applications, interviewRows, notes, activity, emails, consents] = await Promise.all([
      db
        .select({
          id: candidateApplications.id,
          jobTitle: jobPostings.title,
          status: candidateApplications.status,
          appliedAt: candidateApplications.appliedAt,
          coverLetter: candidateApplications.coverLetter,
        })
        .from(candidateApplications)
        .leftJoin(jobPostings, eq(jobPostings.id, candidateApplications.jobPostingId))
        .where(eq(candidateApplications.candidateId, candidateId)),
      db
        .select({
          id: interviews.id,
          type: interviews.type,
          scheduledAt: interviews.scheduledAt,
          result: interviews.result,
        })
        .from(interviews)
        .where(eq(interviews.candidateId, candidateId)),
      db
        .select({ body: atsCandidateNotes.body, createdAt: atsCandidateNotes.createdAt })
        .from(atsCandidateNotes)
        .where(eq(atsCandidateNotes.candidateId, candidateId)),
      db
        .select({ type: atsActivity.type, createdAt: atsActivity.createdAt })
        .from(atsActivity)
        .where(eq(atsActivity.candidateId, candidateId)),
      db
        .select({
          templateId: atsEmailLog.templateId,
          toEmail: atsEmailLog.toEmail,
          sentAt: atsEmailLog.sentAt,
        })
        .from(atsEmailLog)
        .where(eq(atsEmailLog.candidateId, candidateId)),
      db
        .select({
          type: atsConsents.type,
          textVersion: atsConsents.textVersion,
          grantedAt: atsConsents.grantedAt,
          expiresAt: atsConsents.expiresAt,
        })
        .from(atsConsents)
        .where(eq(atsConsents.candidateId, candidateId)),
    ]);

    let resumeUrl: string | null = null;
    if (candidate.resumeUrl) {
      try {
        resumeUrl = await getFileUrl(candidate.resumeUrl, 3600);
      } catch (error) {
        logger.warn("Could not sign the resume for export", { candidateId, error });
      }
    }

    await createAuditLog({
      action: "ats.candidate_exported",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(candidateId),
      targetType: "candidate",
    });

    const payload = {
      exportedAt: new Date().toISOString(),
      candidate: {
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
        phone: candidate.phone,
        linkedinUrl: candidate.linkedinUrl,
        source: candidate.source,
        createdAt: candidate.createdAt,
      },
      resume: { link: resumeUrl, expiresInSeconds: resumeUrl ? 3600 : null },
      applications,
      interviews: interviewRows,
      notes,
      activity,
      emails,
      consents,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="candidate-${candidateId}.json"`,
      },
    });
  }, req);
}
