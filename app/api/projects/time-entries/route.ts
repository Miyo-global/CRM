

import { NextRequest } from "next/server";
import { withAuth, ok, toNumber } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { timesheets, tickets } from "@/lib/db/schema";
import { eq, and, gte, lte, inArray, desc } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get("userId") ?? undefined;
    const projectId = toNumber(searchParams.get("projectId"));
    const ticketId = toNumber(searchParams.get("ticketId"));
    const startDate = searchParams.get("startDate") ?? undefined;
    const endDate = searchParams.get("endDate") ?? undefined;
    const page = toNumber(searchParams.get("page")) ?? 1;
    const limit = toNumber(searchParams.get("limit")) ?? 50;
    const offset = (page - 1) * limit;

    const isOwnerOrAdmin = isAdminOrOwner(session.user.role);

    const conditions = [eq(timesheets.orgId, session.orgId!)];

    if (ticketId) {
      conditions.push(eq(timesheets.ticketId, ticketId));
    }

    if (projectId) {
      conditions.push(
        inArray(
          timesheets.ticketId,
          db
            .select({ id: tickets.id })
            .from(tickets)
            .where(and(eq(tickets.projectId, projectId), eq(tickets.orgId, session.orgId!)))
        )
      );
    }

    if (userId) {
      conditions.push(eq(timesheets.userId, userId));
    } else if (!isOwnerOrAdmin) {

      conditions.push(eq(timesheets.userId, session.user.id));
    }

    if (startDate) {
      conditions.push(gte(timesheets.date, startDate));
    }

    if (endDate) {
      conditions.push(lte(timesheets.date, endDate));
    }

    const entries = await db.query.timesheets.findMany({
      where: and(...conditions),
      orderBy: [desc(timesheets.date)],
      limit,
      offset,
      with: {
        ticket: {
          with: { project: true },
        },
      },
    });

    return ok(entries);
  });
}
