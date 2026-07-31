

import { NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { sprints, timesheets } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { differenceInCalendarDays, addDays } from "date-fns";
import { formatDateOnly } from "@/lib/date-utils";

type RouteParams = { params: Promise<{ projectId: string; sprintId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { sprintId } = await params;
    const id = Number(sprintId);
    if (!id) return err("Invalid sprint id", 400);

    const sprint = await db.query.sprints.findFirst({
      where: and(eq(sprints.id, id), eq(sprints.orgId, session.orgId!)),
      with: { tickets: true },
    });

    if (!sprint) return err("Sprint not found", 404);

    const totalPoints = sprint.tickets.reduce(
      (sum, t) => sum + (t.points || 0),
      0
    );

    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);
    const days = differenceInCalendarDays(endDate, startDate) + 1;

    const idealBurndown = Array.from({ length: days }).map((_, i) => {
      const date = addDays(startDate, i);
      const remainingDays = days - i;
      const idealPoints = Math.max(0, (totalPoints / days) * remainingDays);
      return { date, points: idealPoints };
    });

    const allTimeEntries = await db.query.timesheets.findMany({
      where: and(
        eq(timesheets.orgId, session.orgId!),
        sql`${timesheets.ticketId} IN (SELECT id FROM tickets WHERE sprint_id = ${id})`
      ),
      with: { ticket: true },
    });

    const completedTickets = sprint.tickets.filter((t) => t.status === "DONE");
    const completedPointsByDate = new Map<string, number>();

    completedTickets.forEach((ticket) => {
      const ticketEntries = allTimeEntries.filter((e) => e.ticketId === ticket.id);
      if (ticketEntries.length > 0) {
        const lastEntry = ticketEntries.reduce((latest, entry) =>
          new Date(entry.date) > new Date(latest.date) ? entry : latest
        );
        const dateKey = formatDateOnly(new Date(lastEntry.date));
        const current = completedPointsByDate.get(dateKey) || 0;
        completedPointsByDate.set(dateKey, current + (ticket.points || 0));
      }
    });

    let cumulativePoints = 0;
    const actualBurndown = idealBurndown.map((ideal) => {
      const dateKey = formatDateOnly(ideal.date as Date);
      const dayPoints = completedPointsByDate.get(dateKey) || 0;
      cumulativePoints += dayPoints;
      return { date: ideal.date, points: totalPoints - cumulativePoints };
    });

    return ok({ sprint, totalPoints, idealBurndown, actualBurndown });
  });
}
