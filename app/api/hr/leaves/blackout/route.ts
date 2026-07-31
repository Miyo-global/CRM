import { type NextRequest } from "next/server";
import { withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveBlackoutDates } from "@/lib/db/schema";
import { eq, and, gte, lte, or } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(1).max(500),
  appliesTo: z.enum(["ALL"]).default("ALL"),
});

export async function GET(req: NextRequest) {
  return withAdmin(async (session) => {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const conditions = [eq(leaveBlackoutDates.orgId, session.orgId)];

    if (from) {
      conditions.push(gte(leaveBlackoutDates.endDate, from));
    }
    if (to) {
      conditions.push(lte(leaveBlackoutDates.startDate, to));
    }

    const rows = await db.query.leaveBlackoutDates.findMany({
      where: and(...conditions),
      orderBy: (t, { asc }) => [asc(t.startDate)],
    });

    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const input = await parseBody(req, createSchema);

    if (input.startDate > input.endDate) {
      return err("Start date must be on or before end date", 400);
    }

    const overlap = await db.query.leaveBlackoutDates.findFirst({
      where: and(
        eq(leaveBlackoutDates.orgId, session.orgId),
        lte(leaveBlackoutDates.startDate, input.endDate),
        gte(leaveBlackoutDates.endDate, input.startDate),
      ),
    });
    if (overlap) {
      return err("A blackout period already overlaps these dates", 409);
    }

    const [row] = await db
      .insert(leaveBlackoutDates)
      .values({
        orgId: session.orgId,
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason,
        appliesTo: input.appliesTo,
        createdBy: session.user.id,
      })
      .returning();

    return ok(row, 201);
  });
}
