import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import { db } from "@/lib/db";
import {
  atsActivity,
  candidates,
  interviewBookingLinks,
  interviews,
  jobPostings,
} from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { checkRateLimit } from "@/lib/rate-limit";
import { interviewUid } from "@/lib/ats/ics";
import { interviewerContacts, sendInterviewInvite } from "@/lib/ats/interviews";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  token: z.string().min(10).max(200),
  start: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Pick one of the times."),
});

/**
 * MIYO-0660: the candidate picks a slot. Public, so it is rate limited,
 * identified only by the token, and the chosen time must be one of the
 * times that were offered.
 */
export async function POST(req: NextRequest) {
  if (!ATS_MODULE_ENABLED) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const limit = await checkRateLimit("ats-apply", `booking:${ip}`);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  try {
    const body = bodySchema.parse(await req.json());

    const link = await db.query.interviewBookingLinks.findFirst({
      where: eq(interviewBookingLinks.token, body.token),
    });
    if (!link) return NextResponse.json({ error: "This link is not valid." }, { status: 404 });
    if (link.status === "booked") {
      return NextResponse.json({ error: "You have already picked a time." }, { status: 409 });
    }
    if (link.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "This link has expired." }, { status: 410 });
    }

    const chosen = new Date(body.start).toISOString();
    if (!link.availableSlots.some((slot) => slot.start === chosen)) {
      return NextResponse.json({ error: "That time is not on offer." }, { status: 400 });
    }

    const [created] = await db
      .insert(interviews)
      .values({
        orgId: link.orgId,
        candidateId: link.candidateId,
        jobPostingId: link.jobPostingId,
        interviewerId: link.interviewerIds[0],
        panelInterviewerIds: link.interviewerIds,
        type: link.interviewType as "VIDEO",
        scheduledAt: new Date(chosen),
        duration: link.durationMinutes,
        icsSequence: 0,
      })
      .returning();

    await db
      .update(interviews)
      .set({ icsUid: interviewUid(created.id) })
      .where(eq(interviews.id, created.id));

    await db
      .update(interviewBookingLinks)
      .set({ status: "booked", selectedSlot: new Date(chosen), updatedAt: new Date() })
      .where(eq(interviewBookingLinks.id, link.id));

    const [candidate, job, interviewers] = await Promise.all([
      db.query.candidates.findFirst({ where: eq(candidates.id, link.candidateId) }),
      link.jobPostingId
        ? db.query.jobPostings.findFirst({ where: eq(jobPostings.id, link.jobPostingId) })
        : null,
      interviewerContacts(link.interviewerIds),
    ]);

    if (candidate) {
      try {
        await sendInterviewInvite({
          interviewId: created.id,
          orgId: link.orgId,
          candidate,
          jobTitle: job?.title ?? "the role",
          interviewers: interviewers.map((i) => ({ email: i.email, name: i.name })),
          scheduledAt: new Date(chosen),
          duration: link.durationMinutes,
          sequence: 0,
          type: link.interviewType,
          locationOrLink: "To be confirmed",
          recruiterName: "the hiring team",
        });
      } catch (error) {
        logger.error("Self-scheduled invite failed", { interviewId: created.id, error });
      }
    }

    await db.insert(atsActivity).values({
      orgId: link.orgId,
      candidateId: link.candidateId,
      type: "interview_scheduled",
      data: { interviewId: created.id, selfScheduled: true, scheduledAt: chosen },
    });

    return NextResponse.json({ ok: true, scheduledAt: chosen });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? "Check the form." }, { status: 400 });
    }
    logger.error("Self-scheduling failed", { error: e });
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
