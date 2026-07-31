import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  candidates,
  candidateApplications,
  jobPostings,
} from "@/lib/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { getCandidateRejectionEmail } from "@/lib/email-templates/hr";
import { COMPANY_LEGAL_NAME } from "@/lib/constants/company";
import { writeAuditLog } from "@/lib/db/audit";
import { isRecruitmentHr } from "@/lib/constants/roles";
import { logger } from "@/lib/logger";
import type { NextRequest } from "next/server";

const bulkRejectSchema = z.object({
  candidateIds: z
    .array(z.number().int().positive())
    .min(1, "Provide at least one candidate ID")
    .max(100, "Cannot reject more than 100 candidates at once"),
  sendRejectionEmail: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isRecruitmentHr(session.user.role)) {
      return err("Forbidden: HR/Admin role required", 403);
    }

    const body = await parseBody(req, bulkRejectSchema);
    const { candidateIds, sendRejectionEmail } = body;

    const existing = await db
      .select({
        id: candidates.id,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        email: candidates.email,
        status: candidates.status,
      })
      .from(candidates)
      .where(
        and(
          inArray(candidates.id, candidateIds),
          eq(candidates.orgId, session.orgId)
        )
      );

    if (existing.length === 0) {
      return err("No matching candidates found", 404);
    }

    const toReject = existing.filter((c) => c.status !== "REJECTED");
    const alreadyRejected = existing.length - toReject.length;

    if (toReject.length === 0) {
      return ok({ rejected: 0, alreadyRejected, emailsSent: 0 });
    }

    const toRejectIds = toReject.map((c) => c.id);

    await db
      .update(candidates)
      .set({ status: "REJECTED", updatedAt: new Date() })
      .where(inArray(candidates.id, toRejectIds));

    void Promise.all(
      toReject.map((c) =>
        writeAuditLog({
          action: "CANDIDATE_STAGE_CHANGED",
          userId: session.user.id,
          orgId: session.orgId,
          targetId: String(c.id),
          targetType: "candidate",
          metadata: {
            from: c.status,
            to: "REJECTED",
            candidateName: `${c.firstName} ${c.lastName}`,
            bulk: true,
          },
        }).catch(() => undefined)
      )
    );

    let emailsSent = 0;

    if (sendRejectionEmail) {
      const companyName = COMPANY_LEGAL_NAME;

      const latestApps = await db
        .select({
          candidateId: candidateApplications.candidateId,
          jobTitle: jobPostings.title,
        })
        .from(candidateApplications)
        .leftJoin(jobPostings, eq(candidateApplications.jobPostingId, jobPostings.id))
        .where(inArray(candidateApplications.candidateId, toRejectIds))
        .orderBy(desc(candidateApplications.appliedAt));

      const jobTitleMap: Record<number, string> = {};
      for (const app of latestApps) {
        if (app.jobTitle && jobTitleMap[app.candidateId] === undefined) {
          jobTitleMap[app.candidateId] = app.jobTitle;
        }
      }

      const emailPromises = toReject.map(async (candidate) => {
        if (!candidate.email) return;
        try {
          const { subject, html } = getCandidateRejectionEmail({
            candidateName: `${candidate.firstName} ${candidate.lastName}`,
            jobTitle: jobTitleMap[candidate.id],
            companyName,
            senderName: session.user.name ?? undefined,
            attendedInterview:
              candidate.status === "INTERVIEW" ||
              candidate.status === "OFFER" ||
              candidate.status === "HIRED",
          });
          await sendEmail({ to: candidate.email, subject, html });
          emailsSent++;
        } catch (error) {
          logger.error("Failed to send candidate rejection email", { candidateId: candidate.id, error });
        }
      });

      await Promise.allSettled(emailPromises);
    }

    return ok({
      rejected: toReject.length,
      alreadyRejected,
      emailsSent,
    });
  });
}
