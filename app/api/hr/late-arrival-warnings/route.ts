import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { lateArrivalWarnings, organizationMembers } from "@/lib/db/schema";
import { eq, and, count, desc } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { createNotification } from "@/server/actions/create-notification";
import { z } from "zod";
import type { NextRequest } from "next/server";

const logWarningSchema = z.object({
  userId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  attendanceId: z.number().int().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const isAdmin = isAdminOrOwner(session.user.role);
    const userId = req.nextUrl.searchParams.get("userId");

    if (!isAdmin && !userId) return err("userId required.", 400);
    if (!isAdmin && userId !== session.user.id) return err("Not authorized.", 403);

    const targetUserId = userId ?? session.user.id;

    const rows = await db.query.lateArrivalWarnings.findMany({
      where: and(
        eq(lateArrivalWarnings.orgId, session.orgId),
        eq(lateArrivalWarnings.userId, targetUserId)
      ),
      with: {
        notedByUser: { columns: { id: true, name: true } },
      },
      orderBy: [desc(lateArrivalWarnings.createdAt)],
    });

    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can log late arrival warnings.", 403);
    }

    const body = await parseBody(req, logWarningSchema);

    const membership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, body.userId),
        eq(organizationMembers.orgId, session.orgId)
      ),
    });
    if (!membership) return err("Employee not found.", 404);

    const [{ value: existingCount }] = await db
      .select({ value: count() })
      .from(lateArrivalWarnings)
      .where(and(
        eq(lateArrivalWarnings.orgId, session.orgId),
        eq(lateArrivalWarnings.userId, body.userId)
      ));

    const warningNumber = Number(existingCount) + 1;

    const [warning] = await db.insert(lateArrivalWarnings).values({
      orgId: session.orgId,
      userId: body.userId,
      date: body.date,
      warningNumber,
      attendanceId: body.attendanceId ?? null,
      notedBy: session.user.id,
    }).returning();

    void createNotification({
      userId: body.userId,
      orgId: session.orgId,
      title: `Late arrival warning #${warningNumber}`,
      message: `A late arrival warning has been logged for ${body.date}. (Warning ${warningNumber} — no deduction applied)`,
      link: "/hr/attendance",
    }).catch(() => {});

    return ok(warning);
  });
}
