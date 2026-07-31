import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

type Ctx = { params: Promise<{ leadId: string }> };

export async function PATCH(_req: NextRequest, ctx: Ctx) {
  const { leadId: id } = await ctx.params;
  const leadId = Number(id);
  if (!Number.isFinite(leadId)) return err("Invalid lead id", 400);

  return withAuth(async (session) => {
    const [updated] = await db.update(leads)
      .set({
        assignedToId: session.user.id,
        assignedById: session.user.id,
        assignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(leads.id, leadId), eq(leads.orgId, session.orgId!), isNull(leads.deletedAt), isNull(leads.assignedToId)))
      .returning();

    if (!updated) return err("Lead not found or already assigned", 409);
    return ok(updated);
  });
}
