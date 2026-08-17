import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { interviewBookingLinks, interviews, calendarEvents, candidates, organizations } from "@/lib/db/schema";
import { eq, and, lt, gt, or, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { checkRateLimitRedis } from "@/lib/rate-limit-redis";
import { logger } from "@/lib/logger";
import { escapeHtml } from "@/lib/email-templates/base";
import { buildBookingConfirmationHtml } from "@/lib/email-templates/hr-recruitment";
import { DEFAULT_LOCALE, DEFAULT_TIMEZONE } from "@/lib/constants/locale";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;

  const link = await db.query.interviewBookingLinks.findFirst({
    where: eq(interviewBookingLinks.token, token),
  });

  if (!link) {
    return NextResponse.json({ error: "Booking link not found." }, { status: 404 });
  }

  if (link.status !== "pending") {
    return NextResponse.json({ error: "This booking link has already been used.", status: link.status }, { status: 410 });
  }

  if (new Date() > link.expiresAt) {
    return NextResponse.json({ error: "This booking link has expired." }, { status: 410 });
  }

  const candidate = await db.query.candidates.findFirst({
    where: eq(candidates.id, link.candidateId),
    columns: { firstName: true, lastName: true },
  });

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, link.orgId),
    columns: { name: true },
  });

  return NextResponse.json({
    candidateName: candidate ? `${candidate.firstName} ${candidate.lastName}` : "Candidate",
    orgName: org?.name ?? "Miyo Global",
    interviewType: link.interviewType,
    durationMinutes: link.durationMinutes,
    availableSlots: link.availableSlots,
    notes: link.notes,
  });
}

const bookSchema = z.object({
  slotStart: z.string().datetime(),
});

export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params;

  const rl = await checkRateLimitRedis("public-intake", getClientIp(req));
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const link = await db.query.interviewBookingLinks.findFirst({
    where: eq(interviewBookingLinks.token, token),
  });

  if (!link) {
    return NextResponse.json({ error: "Booking link not found." }, { status: 404 });
  }

  if (link.status !== "pending") {
    return NextResponse.json({ error: "This booking link has already been used." }, { status: 410 });
  }

  if (new Date() > link.expiresAt) {
    return NextResponse.json({ error: "This booking link has expired." }, { status: 410 });
  }

  let body: z.infer<typeof bookSchema>;
  try {
    body = bookSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const slotStart = new Date(body.slotStart);
  if (slotStart.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Selected slot is in the past." }, { status: 400 });
  }
  const validSlot = link.availableSlots.some(
    (s) => new Date(s.start).getTime() === slotStart.getTime()
  );
  if (!validSlot) {
    return NextResponse.json({ error: "Selected slot is not available." }, { status: 400 });
  }

  const endDate = new Date(slotStart.getTime() + link.durationMinutes * 60_000);

  const panelIds = link.interviewerIds.length > 0 ? link.interviewerIds : [link.createdBy];
  const primaryInterviewerId = panelIds[0];

  const typeMap: Record<string, "VIDEO" | "PHONE" | "ONSITE"> = {
    VIDEO: "VIDEO",
    PHONE: "PHONE",
    IN_PERSON: "ONSITE",
  };

  const result = await db.transaction(async (tx) => {
    const interviewConflict = await tx
      .select({ id: interviews.id })
      .from(interviews)
      .where(
        and(
          eq(interviews.orgId, link.orgId),
          inArray(interviews.interviewerId, panelIds),
          lt(interviews.scheduledAt, endDate),
          gt(
            sql`${interviews.scheduledAt} + (${interviews.duration} * interval '1 minute')`,
            slotStart
          )
        )
      )
      .limit(1);

    if (interviewConflict.length > 0) {
      throw new Error("SLOT_CONFLICT");
    }

    const calConflict = await tx
      .select({ id: calendarEvents.id })
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.orgId, link.orgId),
          lt(calendarEvents.startDate, endDate),
          gt(calendarEvents.endDate, slotStart),
          or(
            inArray(calendarEvents.createdBy, panelIds),
            ...panelIds.map(
              (id) => sql`${calendarEvents.attendeeIds} @> ${JSON.stringify([id])}::jsonb`
            )
          )
        )
      )
      .limit(1);

    if (calConflict.length > 0) {
      throw new Error("SLOT_CONFLICT");
    }

    const claimed = await tx
      .update(interviewBookingLinks)
      .set({ status: "booked", selectedSlot: slotStart, updatedAt: new Date() })
      .where(
        and(
          eq(interviewBookingLinks.id, link.id),
          eq(interviewBookingLinks.status, "pending")
        )
      )
      .returning({ id: interviewBookingLinks.id });

    if (claimed.length === 0) {
      throw new Error("ALREADY_BOOKED");
    }

    const [created] = await tx
      .insert(interviews)
      .values({
        orgId: link.orgId,
        candidateId: link.candidateId,
        jobPostingId: link.jobPostingId,
        interviewerId: primaryInterviewerId,
        type: typeMap[link.interviewType] ?? "VIDEO",
        scheduledAt: slotStart,
        duration: link.durationMinutes,
        notes: link.notes,
        result: "PENDING",
        remindersSent: {},
      })
      .returning();

    await tx.insert(calendarEvents).values({
      orgId: link.orgId,
      title: `Interview (self-scheduled)`,
      description: link.notes ?? `Self-scheduled ${link.interviewType} interview`,
      startDate: slotStart,
      endDate,
      allDay: false,
      category: "interview",
      entityType: "interview",
      entityId: String(created.id),
      createdBy: primaryInterviewerId,
      attendeeIds: panelIds,
    });

    return created;
  }).catch((e) => {
    if (e instanceof Error && (e.message === "ALREADY_BOOKED" || e.message === "SLOT_CONFLICT")) {
      return e.message;
    }
    throw e;
  });

  if (result === "ALREADY_BOOKED") {
    return NextResponse.json({ error: "This booking link has already been used." }, { status: 410 });
  }
  if (result === "SLOT_CONFLICT") {
    return NextResponse.json(
      { error: "This slot is no longer available; please pick another." },
      { status: 409 }
    );
  }
  const interview = result;

  void (async () => {
    try {
      const [candidate, org] = await Promise.all([
        db.query.candidates.findFirst({
          where: eq(candidates.id, link.candidateId),
          columns: { firstName: true, lastName: true, email: true },
        }),
        db.query.organizations.findFirst({
          where: eq(organizations.id, link.orgId),
          columns: { name: true },
        }),
      ]);
      const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : "Candidate";
      const orgName = org?.name ?? "Miyo Global";
      const slotFormatted = slotStart.toLocaleString(DEFAULT_LOCALE, {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: DEFAULT_TIMEZONE,
      });

      const { users } = await import("@/lib/db/schema");
      const creator = await db.query.users.findFirst({
        where: eq(users.id, link.createdBy),
        columns: { email: true, name: true },
      });

      await Promise.allSettled([
        creator?.email
          ? sendEmail({
              to: creator.email,
              subject: `Interview Self-Scheduled: ${candidateName}`,
              html: `<p>${escapeHtml(candidateName)} has scheduled their interview for <strong>${escapeHtml(slotFormatted)}</strong>.</p>`,
            })
          : Promise.resolve(),
        candidate?.email
          ? sendEmail({
              to: candidate.email,
              ...buildBookingConfirmationHtml({
                candidateName,
                orgName,
                slotFormatted,
                durationMinutes: link.durationMinutes,
                meetingLink: null,
              }),
            })
          : Promise.resolve(),
      ]);
    } catch (e) {
      logger.error("Failed to send interview self-schedule confirmation email", e);
    }
  })();

  return NextResponse.json({ success: true, interviewId: interview.id });
}
