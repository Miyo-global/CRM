import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getWorkLogs } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { timesheets } from "@/lib/db/schema/projects";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { formatDateOnly, getTodayString } from "@/lib/date-utils";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { dateOnlySchema } from "@/lib/validations/date";

const postWorkLogSchema = z.object({
  date: dateOnlySchema.refine((d) => d <= getTodayString(), "Cannot log work for a future date."),
  hours: z
    .number()
    .min(0, "Hours cannot be negative")
    .max(24, "Hours cannot exceed 24 in a day")
    .optional(),
  description: z
    .string()
    .max(5000, "Description must be at most 5000 characters")
    .optional(),
  workLink: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const isAdmin = isAdminOrOwner(session.user.role);
    const filterUserId = searchParams.get("userId") ?? undefined;
    const departmentIdRaw = searchParams.get("departmentId");
    const year = searchParams.get("year");
    const quarter = searchParams.get("quarter");
    const monthRaw = searchParams.get("month");
    const dateFrom = searchParams.get("dateFrom") ?? undefined;
    const dateTo = searchParams.get("dateTo") ?? undefined;

    if (filterUserId && filterUserId !== session.user.id && !isAdmin) {
      return err("Not authorized to view other users' work logs.", 403);
    }

    if (!year || !quarter) {
      return err("year and quarter query params are required.", 400);
    }

    const data = await getWorkLogs({
      orgId: session.orgId,
      requesterId: session.user.id,
      isAdmin,
      year: Number(year),
      quarter: Number(quarter),
      month: monthRaw != null && monthRaw !== "" ? Number(monthRaw) : undefined,
      dateFrom,
      dateTo,
      userId: filterUserId,
      departmentId: departmentIdRaw ? Number(departmentIdRaw) : undefined,
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, postWorkLogSchema);

    const dateStr = formatDateOnly(body.date);

    const normalizedDescription = body.description
      ? body.description.replace(/^(\s*)(\w)/, (_, ws, c) => ws + c.toUpperCase())
      : body.description;

    const existing = await db.query.timesheets.findFirst({
      where: and(
        eq(timesheets.orgId, session.orgId),
        eq(timesheets.userId, session.user.id),
        eq(timesheets.date, dateStr)
      ),
    });

    const workLink = body.workLink || null;
    const hoursStr = body.hours != null ? body.hours.toString() : null;

    if (existing) {
      const [updated] = await db
        .update(timesheets)
        .set({
          description: normalizedDescription,
          hours: hoursStr ?? existing.hours,
          workLink,
          status: "SAVED",
          updatedAt: new Date(),
        })
        .where(eq(timesheets.id, existing.id))
        .returning();
      return ok(updated);
    }

    const [created] = await db
      .insert(timesheets)
      .values({
        orgId: session.orgId,
        userId: session.user.id,
        date: dateStr,
        description: normalizedDescription,
        hours: hoursStr ?? "0",
        workLink,
        status: "SAVED",
      })
      .returning();

    return ok(created);
  });
}
