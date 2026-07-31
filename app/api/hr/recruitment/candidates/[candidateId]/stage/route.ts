import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidates, candidateApplications, candidateSlaTracking } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { writeAuditLog } from "@/lib/db/audit";
import { notifyByRoles } from "@/server/actions/create-notification";
import { getCandidateRejectionEmail } from "@/lib/email-templates/hr";
import { getCandidateShortlistedEmail } from "@/lib/email-templates/hr-recruitment";
import { COMPANY_LEGAL_NAME } from "@/lib/constants/company";
import { sendEmail } from "@/lib/email";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { logger } from "@/lib/logger";
import { HR_NOTIFICATION_EMAIL } from "@/lib/constants/hr-leave-routing";
import type { NextRequest } from "next/server";

const CANDIDATE_STAGES = ["NEW", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"] as const;
type CandidateStage = (typeof CANDIDATE_STAGES)[number];

const stageSchema = z.object({
  stage: z.enum(CANDIDATE_STAGES),
  sendEmail: z.boolean().optional().default(false),
});

const ALLOWED_TRANSITIONS: Record<CandidateStage, CandidateStage[]> = {
  NEW: ["SCREENING", "INTERVIEW", "REJECTED"],
  SCREENING: ["NEW", "INTERVIEW", "REJECTED"],
  INTERVIEW: ["SCREENING", "OFFER", "REJECTED"],
  OFFER: ["INTERVIEW", "HIRED", "REJECTED"],
  HIRED: [],
  REJECTED: ["NEW", "SCREENING"],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only HR or admins can change a candidate's stage.", 403);
    }

    const { candidateId: rawId } = await params;
    const candidateId = Number(rawId);
    if (!candidateId || isNaN(candidateId)) return err("Invalid candidate ID.", 400);

    const body = await parseBody(req, stageSchema);
    const newStage: CandidateStage = body.stage;

    const existing = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
    });
    if (!existing) return err("Candidate not found.", 404);

    if (existing.status === newStage) {
      return ok({ id: candidateId, stage: newStage, changed: false });
    }

    const currentStage = (existing.status ?? "NEW") as CandidateStage;
    const allowed = ALLOWED_TRANSITIONS[currentStage] ?? [];
    if (!allowed.includes(newStage)) {
      return err(`Cannot move a candidate from ${currentStage} to ${newStage}.`, 400);
    }

    const [updated] = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(candidates)
        .set({ status: newStage, updatedAt: new Date() })
        .where(eq(candidates.id, candidateId))
        .returning();

      if (newStage === "HIRED" || newStage === "REJECTED") {
        await tx
          .update(candidateSlaTracking)
          .set({ status: "COMPLETE", updatedAt: new Date() })
          .where(eq(candidateSlaTracking.candidateId, candidateId));
      } else {
        const [existingSla] = await tx
          .select({ id: candidateSlaTracking.id })
          .from(candidateSlaTracking)
          .where(
            and(
              eq(candidateSlaTracking.candidateId, candidateId),
              eq(candidateSlaTracking.stage, newStage),
            ),
          )
          .limit(1);

        if (existingSla) {
          await tx
            .update(candidateSlaTracking)
            .set({
              enteredAt: new Date(),
              breachedAt: null,
              status: "ON_TRACK",
              updatedAt: new Date(),
            })
            .where(eq(candidateSlaTracking.id, existingSla.id));
        } else {
          await tx.insert(candidateSlaTracking).values({
            orgId: session.orgId,
            candidateId,
            stage: newStage,
            enteredAt: new Date(),
            breachedAt: null,
            status: "ON_TRACK",
            updatedAt: new Date(),
          });
        }
      }

      return [row];
    });

    void writeAuditLog({
      action: "CANDIDATE_STAGE_CHANGED",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(candidateId),
      targetType: "candidate",
      metadata: {
        from: existing.status,
        to: newStage,
        candidateName: `${existing.firstName} ${existing.lastName}`,
      },
    });

    const candidateName = `${existing.firstName} ${existing.lastName}`;

    if (newStage === "SCREENING") {
      void notifyByRoles(session.orgId, ["CEO", "HR", "ADMIN", "BRANCH_HR"], {
        type: "INFO",
        title: "Candidate Shortlisted",
        message: `${candidateName} has been moved to Screening.`,
        link: `/hr/recruitment/candidates/${candidateId}`,
        metadata: { candidateId, stage: newStage },
      });

      if (body.sendEmail && existing.email) {
        void (async () => {
          try {
            const latestApp = await db.query.candidateApplications.findFirst({
              where: eq(candidateApplications.candidateId, candidateId),
              with: { jobPosting: true },
              orderBy: (t, { desc }) => [desc(t.appliedAt)],
            });
            const jobTitle = latestApp?.jobPosting?.title ?? "the position";
            const { subject, html } = getCandidateShortlistedEmail({
              candidateName,
              jobTitle,
              companyName: COMPANY_LEGAL_NAME,
            });
            await sendEmail({ to: existing.email!, bcc: HR_NOTIFICATION_EMAIL, subject, html });
          } catch (error) {
            logger.error("Failed to send candidate shortlisted email", { candidateId, error });
          }
        })();
      }
    }

    if (newStage === "REJECTED") {
      void notifyByRoles(session.orgId, ["CEO", "HR", "ADMIN", "BRANCH_HR"], {
        type: "INFO",
        title: "Candidate Rejected",
        message: `${candidateName} has been moved to Rejected.`,
        link: `/hr/recruitment/candidates/${candidateId}`,
        metadata: { candidateId, stage: newStage },
      });

      if (body.sendEmail && existing.email) {
        void (async () => {
          try {
            const latestApp = await db.query.candidateApplications.findFirst({
              where: eq(candidateApplications.candidateId, candidateId),
              with: { jobPosting: true },
              orderBy: (t, { desc }) => [desc(t.appliedAt)],
            });
            const jobPosting = latestApp?.jobPosting ?? null;
            const attendedInterview =
              existing.status === "INTERVIEW" ||
              existing.status === "OFFER" ||
              existing.status === "HIRED";
            const { subject, html } = getCandidateRejectionEmail({
              candidateName,
              jobTitle: jobPosting?.title,
              companyName: COMPANY_LEGAL_NAME,
              attendedInterview,
            });
            await sendEmail({ to: existing.email!, bcc: HR_NOTIFICATION_EMAIL, subject, html });
          } catch (error) {
            logger.error("Failed to send candidate rejection email", { candidateId, error });
          }
        })();
      }
    }

    if (newStage === "HIRED") {
      void notifyByRoles(session.orgId, ["CEO", "HR", "ADMIN", "BRANCH_HR"], {
        type: "SUCCESS" as const,
        title: "Candidate Hired",
        message: `${candidateName} has been marked as Hired. Please initiate the onboarding process.`,
        link: `/hr/recruitment/candidates/${candidateId}`,
        metadata: { candidateId, stage: newStage },
      });

      void sendEmail({
        to: HR_NOTIFICATION_EMAIL,
        subject: `Candidate Hired: ${candidateName}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#0f2b7f">Candidate Hired</h2>
            <p><strong>${candidateName}</strong> has been marked as <strong>Hired</strong>.</p>
            <p>Please proceed with initiating the employee onboarding process in the HR module.</p>
            <div style="text-align:center;margin:24px 0">
              <a href="/hr/recruitment/candidates/${candidateId}" style="display:inline-block;background:#0f2b7f;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px">View Candidate Profile</a>
            </div>
            <p style="color:#666;font-size:12px">Recruitment Automation · Miyo Global</p>
          </div>
        `,
      }).catch((error) =>
        logger.error("Failed to send hired notification email to HR", { candidateId, error })
      );
    }

    return ok({
      id: updated.id,
      stage: updated.status,
      changed: true,
    });
  });
}
