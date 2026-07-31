import { type NextRequest } from "next/server";
import { withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  priority: z.enum(["HOT", "WARM", "COLD"]).optional(),
  notes: z.string().optional(),
});

type Ctx = { params: Promise<{ leadId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { leadId: id } = await ctx.params;
  const leadId = Number(id);
  if (!Number.isFinite(leadId)) return err("Invalid lead id", 400);

  return withAdmin(async (session) => {
    const input = await parseBody(req, schema);
    const updateData: Record<string, unknown> = {
      verifiedById: session.user.id,
      updatedAt: new Date(),
    };
    if (input.priority) updateData.priority = input.priority;
    if (input.notes) updateData.notes = input.notes;

    const [updated] = await db.update(leads)
      .set(updateData)
      .where(and(eq(leads.id, leadId), eq(leads.orgId, session.orgId!), isNull(leads.deletedAt)))
      .returning();

    if (!updated) return err("Lead not found", 404);
    return ok(updated);
  });
}
