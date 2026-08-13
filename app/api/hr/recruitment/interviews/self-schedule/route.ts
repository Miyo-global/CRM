import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { interviewBookingLinks, candidates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { addDays } from "date-fns";
import { randomBytes } from "crypto";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/email-templates/base";
import { clientEnv } from "@/lib/env";
import type { NextRequest } from "next/server";
import { CRM_BASE_URL } from "@/lib/constants/company";

const slotSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
});

const createBookingSchema = z.object({
  candidateId: z.number().int().positive(),
  jobPostingId: z.number().int().positive().optional(),
  interviewerIds: z.array(z.string()).min(1),
  durationMinutes: z.number().int().min(15).max(180).default(60),
  interviewType: z.enum(["VIDEO", "PHONE", "IN_PERSON"]).default("VIDEO"),
  availableSlots: z.array(slotSchema).min(1, "At least one available slot is required"),
  expiresInDays: z.number().int().min(1).max(30).default(7),
  notes: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }

    const body = await parseBody(req, createBookingSchema);

    const candidate = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, body.candidateId), eq(candidates.orgId, session.orgId)),
      columns: { id: true, firstName: true, lastName: true, email: true },
    });
    if (!candidate) return err("Candidate not found", 404);

    const token = randomBytes(32).toString("hex");
    const expiresAt = addDays(new Date(), body.expiresInDays);

    const [link] = await db
      .insert(interviewBookingLinks)
      .values({
        orgId: session.orgId,
        candidateId: body.candidateId,
        jobPostingId: body.jobPostingId,
        token,
        interviewerIds: body.interviewerIds,
        durationMinutes: body.durationMinutes,
        interviewType: body.interviewType,
        availableSlots: body.availableSlots,
        expiresAt,
        createdBy: session.user.id,
        notes: body.notes,
      })
      .returning();

    const baseUrl = clientEnv.NEXT_PUBLIC_APP_URL ?? CRM_BASE_URL;
    const bookingUrl = `${baseUrl}/interview-booking/${token}`;

    if (candidate.email) {
      const candidateName = `${candidate.firstName} ${candidate.lastName}`.trim();
      void sendEmail({
        to: candidate.email,
        subject: "Schedule Your Interview — Miyo Global",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #0f2b7f; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #fff; margin: 0; font-size: 22px;">Schedule Your Interview</h1>
            </div>
            <div style="padding: 24px; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <p>Dear ${escapeHtml(candidateName)},</p>
              <p>We'd like to invite you to schedule your interview at a time that works best for you.</p>
              <p>Please click the button below to select from the available time slots:</p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${bookingUrl}" style="display: inline-block; padding: 12px 32px; background: #0f2b7f; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">
                  Choose a Time Slot
                </a>
              </div>
              <p style="font-size: 13px; color: #6b7280;">
                This link expires on ${expiresAt.toLocaleDateString("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" })}.
              </p>
              <p>Best regards,<br/><strong>Miyo Global Recruitment Team</strong></p>
            </div>
          </div>
        `,
      }).catch(() => {});
    }

    return ok({ id: link.id, token, bookingUrl, expiresAt: expiresAt.toISOString() }, 201);
  });
}
