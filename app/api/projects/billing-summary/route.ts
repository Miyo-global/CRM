

import { NextRequest } from "next/server";
import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { timesheets, tickets, projects } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const conditions = [
      eq(timesheets.orgId, session.orgId!),
      eq(timesheets.isBillable, true),
    ];

    if (!isAdminOrOwner(session.user.role)) {
      conditions.push(eq(timesheets.userId, session.user.id));
    }

    if (startDate) conditions.push(gte(timesheets.date, startDate));
    if (endDate) conditions.push(lte(timesheets.date, endDate));

    const result = await db
      .select({
        projectId: tickets.projectId,
        projectName: projects.name,
        totalHours: sql<number>`COALESCE(SUM(${timesheets.hours}::numeric), 0)`,
      })
      .from(timesheets)
      .innerJoin(tickets, eq(timesheets.ticketId, tickets.id))
      .innerJoin(projects, eq(tickets.projectId, projects.id))
      .where(and(...conditions))
      .groupBy(tickets.projectId, projects.name);

    return ok(result);
  });
}
