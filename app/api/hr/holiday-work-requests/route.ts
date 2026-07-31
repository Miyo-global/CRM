import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { holidayWorkRequests, holidays, organizationMembers, users, organizations } from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { notifyByRoles } from "@/server/actions/create-notification";
import { ROLES } from "@/lib/constants/roles";
import { sendEmail } from "@/lib/email";
import { getHolidayWorkRequestEmailToHr } from "@/lib/email-templates";
import { logger } from "@/lib/logger";
import { resolveHolidayWorkRequestType } from "@/lib/hr/holiday-work-request-type";
import { getTodayString } from "@/lib/date-utils";
import { z } from "zod";
import type { NextRequest } from "next/server";

const submitSchema = z.object({
  requestDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(5, "Reason must be at least 5 characters."),
  compensationPreference: z.enum(["EXTRA_PAY", "COMP_OFF"]),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const isAdmin = isAdminOrOwner(session.user.role);
    const userId = req.nextUrl.searchParams.get("userId");
    const status = req.nextUrl.searchParams.get("status");

    const whereUser = isAdmin && userId
      ? eq(holidayWorkRequests.userId, userId)
      : !isAdmin
      ? eq(holidayWorkRequests.userId, session.user.id)
      : undefined;

    const whereStatus = status ? eq(holidayWorkRequests.status, status) : undefined;
    const whereOrg = eq(holidayWorkRequests.orgId, session.orgId);

    const conditions = [whereOrg, whereUser, whereStatus].filter(Boolean) as Parameters<typeof and>;
    const rows = await db.query.holidayWorkRequests.findMany({
      where: and(...conditions),
      with: {
        user: { columns: { id: true, name: true, image: true, email: true } },
        approver: { columns: { id: true, name: true } },
        holiday: { columns: { id: true, name: true, date: true, type: true } },
      },
      orderBy: [desc(holidayWorkRequests.createdAt)],
    });

    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, submitSchema);

    if (body.requestDate < getTodayString()) {
      return err("Cannot submit a holiday work request for a past date.", 400);
    }

    const holiday = await db.query.holidays.findFirst({
      where: and(
        eq(holidays.orgId, session.orgId),
        eq(holidays.date, body.requestDate)
      ),
      columns: { id: true, name: true },
    });

    const resolved = resolveHolidayWorkRequestType(body.requestDate, holiday);
    if (!resolved.ok) {
      return err("The selected date is not a Saturday, Sunday, or holiday.", 400);
    }
    const type = resolved.type;

    const existing = await db.query.holidayWorkRequests.findFirst({
      where: and(
        eq(holidayWorkRequests.orgId, session.orgId),
        eq(holidayWorkRequests.userId, session.user.id),
        eq(holidayWorkRequests.requestDate, body.requestDate)
      ),
      columns: { id: true, status: true },
    });
    if (existing) {
      return err(`A request for ${body.requestDate} already exists (status: ${existing.status}).`, 409);
    }

    const [request] = await db.insert(holidayWorkRequests).values({
      orgId: session.orgId,
      userId: session.user.id,
      requestDate: body.requestDate,
      type,
      holidayId: holiday?.id ?? null,
      reason: body.reason,
      compensationPreference: body.compensationPreference,
      status: "PENDING",
    }).returning();

    const dayLabel =
      type === "HOLIDAY" ? `holiday — ${holiday?.name ?? "holiday"}` : type === "SUNDAY" ? "Sunday" : "Saturday";

    void notifyByRoles(session.orgId, [ROLES.CEO, ROLES.HR], {
      title: "Holiday work request submitted",
      message: `${session.user.name ?? session.user.email} requested to work on ${dayLabel} on ${body.requestDate}. Preference: ${body.compensationPreference.replace("_", " ")}.`,
      link: "/hr/attendance",
      metadata: { requestId: request.id, userId: session.user.id },
    }).catch(() => {});

    void emailHrAboutHolidayWorkRequest({
      orgId: session.orgId,
      employeeName: session.user.name ?? session.user.email ?? "Employee",
      employeeEmail: session.user.email ?? null,
      requestDate: body.requestDate,
      dayLabel,
      reason: body.reason,
      compensationPreference: body.compensationPreference,
      submittedAt: request.createdAt ?? new Date(),
    });

    return ok(request);
  });
}

async function emailHrAboutHolidayWorkRequest(params: {
  orgId: string;
  employeeName: string;
  employeeEmail: string | null;
  requestDate: string;
  dayLabel: string;
  reason: string;
  compensationPreference: "COMP_OFF" | "EXTRA_PAY";
  submittedAt: Date | string;
}): Promise<void> {
  try {
    const recipients = await db
      .select({ email: users.email })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(
        and(
          eq(organizationMembers.orgId, params.orgId),
          inArray(organizationMembers.role, [ROLES.CEO, ROLES.HR])
        )
      );

    const toList = recipients.map((r) => r.email).filter((e): e is string => !!e);
    if (toList.length === 0) {
      logger.warn("Holiday-work-request HR email skipped: no CEO/HR recipients", {
        orgId: params.orgId,
      });
      return;
    }

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, params.orgId),
      columns: { name: true },
    });

    const { subject, html } = getHolidayWorkRequestEmailToHr({
      employeeName: params.employeeName,
      employeeEmail: params.employeeEmail,
      requestDate: params.requestDate,
      dayLabel: params.dayLabel,
      reason: params.reason,
      compensationPreference: params.compensationPreference,
      submittedAt: params.submittedAt,
      orgName: org?.name ?? "Miyo Global",
    });

    await sendEmail({ to: toList, subject, html });
  } catch (e) {
    logger.error("Failed to email HR about holiday work request", {
      orgId: params.orgId,
      requestDate: params.requestDate,
      error: e,
    });
  }
}
