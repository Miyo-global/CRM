import { USER_CARD } from "@/lib/db/user-card-columns";
import { NextRequest } from "next/server";
import { withAuth, ok, err, toNumber } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { tickets, timesheets } from "@/lib/db/schema";
import { eq, and, gte, lte, desc, inArray, isNotNull } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can view team timesheets", 403);
    }

    const { searchParams } = req.nextUrl;
    const userId = searchParams.get("userId") ?? undefined;
    const startDate = searchParams.get("startDate") ?? undefined;
    const endDate = searchParams.get("endDate") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const projectId = toNumber(searchParams.get("projectId"));

    const limit = Math.min(Math.max(toNumber(searchParams.get("limit")) ?? 100, 1), 500);
    const offset = Math.max(toNumber(searchParams.get("offset")) ?? 0, 0);

    // Ticket time only: rows with no ticket are the free-form daily work log
    // (/hr/work-logs, drizzle/0194) and rendered here as "Unknown / 0h".
    const conditions = [eq(timesheets.orgId, session.orgId!), isNotNull(timesheets.ticketId)];

    if (userId) conditions.push(eq(timesheets.userId, userId));
    if (startDate) conditions.push(gte(timesheets.date, startDate));
    if (endDate) conditions.push(lte(timesheets.date, endDate));
    if (status) conditions.push(eq(timesheets.status, status));
    // The page's project filter was sent but never applied (R2-PRJ-06).
    if (projectId) {
      conditions.push(
        inArray(
          timesheets.ticketId,
          db.select({ id: tickets.id }).from(tickets).where(and(eq(tickets.orgId, session.orgId!), eq(tickets.projectId, projectId))),
        ),
      );
    }

    const entries = await db.query.timesheets.findMany({
      where: and(...conditions),
      orderBy: [desc(timesheets.date)],
      limit,
      offset,
      with: {
        user: USER_CARD,
        ticket: { with: { project: true } },
      },
    });

    return ok(entries);
  });
}
