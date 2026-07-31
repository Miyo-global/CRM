import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leads, users } from "@/lib/db/schema";
import { eq, and, isNotNull, isNull, lte, asc } from "drizzle-orm";
import { z } from "zod";

const querySchema = z.object({
  overdue: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { overdue, limit } = parseQuery(req, querySchema);
    const maxResults = limit ?? 20;

    const conditions = [
      eq(leads.orgId, session.orgId),
      isNull(leads.deletedAt),
      isNotNull(leads.followUpDate),
    ];

    if (session.user.role === "SALES") {
      conditions.push(eq(leads.assignedToId, session.user.id));
    }

    if (overdue === "true") {
      conditions.push(lte(leads.followUpDate, new Date()));
    }

    const results = await db
      .select({
        id: leads.id,
        name: leads.name,
        email: leads.email,
        phone: leads.phone,
        company: leads.company,
        status: leads.status,
        priority: leads.priority,
        followUpDate: leads.followUpDate,
        followUpNotes: leads.followUpNotes,
        assignedToId: leads.assignedToId,
        assigneeName: users.name,
      })
      .from(leads)
      .leftJoin(users, eq(leads.assignedToId, users.id))
      .where(and(...conditions))
      .orderBy(asc(leads.followUpDate))
      .limit(maxResults);

    return ok({
      items: results,
      total: results.length,
    });
  });
}
