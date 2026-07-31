import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { dealActivities, deals } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

const logSchema = z.object({
  type: z.enum(["call", "email", "meeting", "note", "document"]),
  subject: z.string().optional(),
  notes: z.string().optional(),
  duration: z.number().int().min(0).optional(),
  previousValue: z.string().optional(),
  newValue: z.string().optional(),
});

type Ctx = { params: Promise<{ dealId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { dealId: id } = await ctx.params;
  const dealId = Number(id);
  if (!Number.isFinite(dealId)) return err("Invalid deal id", 400);

  return withAuth(async (session) => {
    const activities = await db
      .select()
      .from(dealActivities)
      .where(and(eq(dealActivities.dealId, dealId), eq(dealActivities.orgId, session.orgId)))
      .orderBy(desc(dealActivities.createdAt))
      .limit(50);

    return ok(activities);
  });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { dealId: id } = await ctx.params;
  const dealId = Number(id);
  if (!Number.isFinite(dealId)) return err("Invalid deal id", 400);

  return withAuth(async (session) => {

    const [deal] = await db
      .select({ id: deals.id })
      .from(deals)
      .where(and(eq(deals.id, dealId), eq(deals.orgId, session.orgId)));

    if (!deal) return err("Deal not found", 404);

    const input = await parseBody(req, logSchema);

    const isContact = input.type === "call" || input.type === "email" || input.type === "meeting";

    const activity = await db.transaction(async (tx) => {
      const [created] = await tx.insert(dealActivities).values({
        orgId: session.orgId,
        dealId,
        type: input.type,
        subject: input.subject ?? null,
        notes: input.notes ?? null,
        duration: input.duration ?? null,
        previousValue: input.previousValue ?? null,
        newValue: input.newValue ?? null,
        userId: session.user.id,
      }).returning();

      await tx
        .update(deals)
        .set({
          ...(isContact ? { lastContactDate: new Date() } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(deals.id, dealId), eq(deals.orgId, session.orgId)));

      return created;
    });

    return ok(activity, 201);
  });
}
