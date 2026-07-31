import { withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { fnfSettlements } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const patchSchema = z.object({
  status: z.enum(["PENDING_APPROVAL", "APPROVED", "PAID"]),
  notes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ fnfId: string }> }
) {
  return withAdmin(async (session) => {
    const { fnfId: id } = await params;
    const fnfId = Number(id);
    if (isNaN(fnfId)) return err("Invalid F&F settlement ID.", 400);

    const body = patchSchema.parse(await req.json());

    const [existing] = await db
      .select()
      .from(fnfSettlements)
      .where(
        and(
          eq(fnfSettlements.id, fnfId),
          eq(fnfSettlements.orgId, session.orgId)
        )
      );

    if (!existing) return err("F&F settlement not found.", 404);

    const [updated] = await db
      .update(fnfSettlements)
      .set({
        status: body.status,
        approvedBy: session.user.id,
        notes: body.notes ?? existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(fnfSettlements.id, fnfId))
      .returning();

    return ok(updated);
  });
}
