import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getWfhRequests } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { wfhRequests, users, organizationMembers } from "@/lib/db/schema";
import { formatDateOnly, getTodayString } from "@/lib/date-utils";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import { sendWfhRequestEmail } from "@/lib/email/hr-leaves";
import { notifyByRoles } from "@/server/actions/create-notification";
import { ROLES } from "@/lib/constants/roles";
import { HR_LEAVE_NOTIFY_EMAIL } from "@/lib/constants/hr-leave-routing";
import { logger } from "@/lib/logger";
import { createWfhRequestSchema, enumerateWorkingDateStrings, resolveWfhMinStartDate } from "@/lib/validations/leave-request";
import { dateOnlySchema } from "@/lib/validations/date";

const createWfhApiSchema = z.object({
  date: dateOnlySchema,
  endDate: dateOnlySchema.optional(),
  reason: z.string().optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    const data = await getWfhRequests(session.orgId, session.user.id);
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createWfhApiSchema);

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { joiningDate: true },
    });
    const joiningDate = user?.joiningDate ? formatDateOnly(user.joiningDate) : null;
    const todayStr = getTodayString();

    const parsed = createWfhRequestSchema({ minStartDate: todayStr, joiningDate }).safeParse({
      startDate: body.date,
      endDate: body.endDate ?? body.date,
      reason: body.reason?.trim() ? body.reason.split(" — ")[0]?.trim() || "Other" : "",
      notes: body.reason?.includes(" — ") ? body.reason.split(" — ").slice(1).join(" — ").trim() : "",
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return err(first?.message ?? "Invalid WFH request.", 400);
    }

    const endDate = body.endDate ?? body.date;
    const workingDays = enumerateWorkingDateStrings(body.date, endDate);
    if (workingDays.length === 0) {
      return err("WFH request cannot be submitted only for weekend days.", 400);
    }

    const { minStartDate } = resolveWfhMinStartDate({ minStartDate: todayStr, joiningDate });
    const pastDay = workingDays.find((day) => day < minStartDate);
    if (pastDay) {
      if (joiningDate && pastDay < joiningDate) {
        return err("Cannot submit WFH for dates before your joining date.", 400);
      }
      return err("Cannot submit a WFH request for a past date.", 400);
    }

    const maxWfhDate = new Date();
    maxWfhDate.setFullYear(maxWfhDate.getFullYear() + 1);
    const maxWfhStr = formatDateOnly(maxWfhDate);
    if (workingDays.some((day) => day > maxWfhStr)) {
      return err("WFH date is too far in the future.", 400);
    }

    const existingForUser = await db.query.wfhRequests.findMany({
      where: and(
        eq(wfhRequests.orgId, session.orgId),
        eq(wfhRequests.userId, session.user.id),
        inArray(wfhRequests.status, ["PENDING", "APPROVED"]),
      ),
      columns: { date: true },
    });
    const takenDates = new Set(existingForUser.map((r) => formatDateOnly(r.date)));

    const duplicateDay = workingDays.find((day) => takenDates.has(day));
    if (duplicateDay) {
      return err(`You already have a WFH request for ${duplicateDay}.`, 409);
    }

    const reasonText = body.reason ?? null;
    const inserted = await db
      .insert(wfhRequests)
      .values(
        workingDays.map((day) => ({
          orgId: session.orgId,
          userId: session.user.id,
          date: formatDateOnly(day),
          reason: reasonText,
          approverId: null,
          status: "PENDING" as const,
        })),
      )
      .returning();

    const request = inserted[0];

    const requester = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { name: true, firstName: true, lastName: true },
    });

    const employeeName =
      requester?.name ||
      `${requester?.firstName ?? ""} ${requester?.lastName ?? ""}`.trim() ||
      session.user.name ||
      "An employee";

    const dateLabel =
      workingDays.length === 1
        ? formatDateOnly(workingDays[0]!)
        : `${formatDateOnly(workingDays[0]!)} – ${formatDateOnly(workingDays[workingDays.length - 1]!)}`;
    const reasonForEmail = reasonText ?? "No reason provided";

    void (async () => {
      const hrMembers = await db
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.orgId, session.orgId),
            eq(organizationMembers.role, ROLES.HR),
          ),
        );

      const emailed = new Set<string>();

      for (const member of hrMembers) {
        const hrUser = await db.query.users.findFirst({
          where: eq(users.id, member.userId),
          columns: { email: true, name: true, firstName: true, lastName: true },
        });
        if (!hrUser?.email) continue;
        const key = hrUser.email.trim().toLowerCase();
        if (emailed.has(key)) continue;
        emailed.add(key);
        const hrName =
          hrUser.name ||
          `${hrUser.firstName ?? ""} ${hrUser.lastName ?? ""}`.trim() ||
          "HR";
        await sendWfhRequestEmail(
          hrUser.email,
          hrName,
          employeeName,
          dateLabel,
          reasonForEmail,
        );
      }

      const inboxKey = HR_LEAVE_NOTIFY_EMAIL.toLowerCase();
      if (!emailed.has(inboxKey)) {
        await sendWfhRequestEmail(
          HR_LEAVE_NOTIFY_EMAIL,
          "HR",
          employeeName,
          dateLabel,
          reasonForEmail,
        );
      }

      await notifyByRoles(session.orgId, [ROLES.HR, ROLES.CEO, ROLES.ADMIN], {
        type: "WARNING",
        title: "WFH request pending",
        message: `${employeeName} requested work from home on ${dateLabel}.`,
        link: "/hr/leaves",
        excludeUserId: session.user.id,
        metadata: { kind: "wfh", requestId: request.id },
      });
    })().catch((error) => {
      logger.error("Failed to notify HR about WFH request", {
        error: error instanceof Error ? error.message : "unknown",
        requestId: request.id,
      });
    });

    return ok({ success: true });
  });
}
