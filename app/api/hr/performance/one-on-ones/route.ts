import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { oneOnOneMeetings, organizationMembers, users } from "@/lib/db/schema";
import { eq, and, desc, gte, or, ne, inArray } from "drizzle-orm";
import { createOneOnOneSchema } from "@/lib/validations/hr";
import { sendOneOnOneInvite } from "@/lib/hr/one-on-one-invite";
import { logger } from "@/lib/logger";
import type { NextRequest } from "next/server";
import { getFromAddress } from "@/lib/email/config";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const upcoming = req.nextUrl.searchParams.get("upcoming");

    const conditions = [
      eq(oneOnOneMeetings.orgId, session.orgId),
      or(
        eq(oneOnOneMeetings.managerId, session.user.id),
        eq(oneOnOneMeetings.employeeId, session.user.id)
      ),
    ];

    if (upcoming === "true") {
      conditions.push(gte(oneOnOneMeetings.scheduledAt, new Date()));
    }

    const data = await db.query.oneOnOneMeetings.findMany({
      where: and(...conditions),
      with: {
        manager: { columns: { id: true, name: true, image: true } },
        employee: { columns: { id: true, name: true, image: true } },
      },
      orderBy: [desc(oneOnOneMeetings.scheduledAt)],
      limit: 100,
    });

    const participantIds = Array.from(
      new Set(data.flatMap((m) => m.additionalParticipants ?? []))
    );

    const participantMap = new Map<
      string,
      { id: string; name: string | null; image: string | null }
    >();
    if (participantIds.length > 0) {
      const participantUsers = await db.query.users.findMany({
        where: inArray(users.id, participantIds),
        columns: { id: true, name: true, image: true },
      });
      for (const u of participantUsers) participantMap.set(u.id, u);
    }

    const enriched = data.map((m) => ({
      ...m,
      additionalParticipantUsers: (m.additionalParticipants ?? [])
        .map((pid) => participantMap.get(pid))
        .filter((u): u is { id: string; name: string | null; image: string | null } => Boolean(u)),
    }));

    return ok(enriched);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createOneOnOneSchema);

    const targetMember = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, body.employeeId),
        eq(organizationMembers.orgId, session.orgId)
      ),
    });
    if (!targetMember) return err("Employee not found in your organization.", 404);

    const scheduledAt = new Date(body.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      return err("Invalid scheduled date/time.", 400);
    }

    const clash = await db.query.oneOnOneMeetings.findFirst({
      where: and(
        eq(oneOnOneMeetings.orgId, session.orgId),
        eq(oneOnOneMeetings.employeeId, body.employeeId),
        eq(oneOnOneMeetings.scheduledAt, scheduledAt),
        ne(oneOnOneMeetings.status, "CANCELLED")
      ),
    });
    if (clash) {
      return err("This employee already has a 1-on-1 scheduled at that date and time.", 409);
    }

    const requestedParticipantIds = Array.from(
      new Set(
        (body.additionalParticipantIds ?? []).filter(
          (id) => id && id !== body.employeeId && id !== session.user.id
        )
      )
    );

    let additionalAttendees: { name: string; email: string }[] = [];
    if (requestedParticipantIds.length > 0) {
      const validParticipants = await db
        .select({ userId: users.id, name: users.name, email: users.email })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(
          and(
            eq(organizationMembers.orgId, session.orgId),
            inArray(organizationMembers.userId, requestedParticipantIds)
          )
        );
      additionalAttendees = validParticipants
        .filter((p) => p.email)
        .map((p) => ({ name: p.name ?? p.email ?? "Participant", email: p.email! }));
    }

    const [meeting] = await db
      .insert(oneOnOneMeetings)
      .values({
        orgId: session.orgId,
        managerId: session.user.id,
        employeeId: body.employeeId,
        scheduledAt,
        duration: body.duration ?? 30,
        agenda: body.agenda,
        meetingLink: body.meetingLink || undefined,
        additionalParticipants: requestedParticipantIds,
        status: "SCHEDULED",
      })
      .returning();

    void (async () => {
      const [employee, manager] = await Promise.all([
        db.query.users.findFirst({
          where: eq(users.id, body.employeeId),
          columns: { email: true, name: true },
        }),
        db.query.users.findFirst({
          where: eq(users.id, session.user.id),
          columns: { email: true, name: true },
        }),
      ]);
      if (!employee?.email) return;
      await sendOneOnOneInvite({
        meetingId: meeting!.id,
        start: scheduledAt,
        durationMinutes: body.duration ?? 30,
        agenda: body.agenda ?? null,
        meetingLink: body.meetingLink || null,
        organizerName: manager?.name ?? "Your manager",
        organizerEmail: manager?.email ?? getFromAddress(),
        attendeeName: employee.name ?? "there",
        attendeeEmail: employee.email,
        additionalAttendees,
      });
    })().catch((e) => logger.error("one-on-one invite failed", e));

    return ok(meeting, 201);
  });
}
