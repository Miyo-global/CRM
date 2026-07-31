import { withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { crmSla } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  appliesTo: z.enum(["lead", "deal", "both"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  firstResponseHours: z.number().int().positive().optional(),
  resolutionHours: z.number().int().positive().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ policyId: string }> }) {
  return withAdmin(async (session) => {
    const { policyId } = await params;
    const id = Number(policyId);
    if (!Number.isFinite(id)) return err("Invalid policy id", 400);

    const input = await parseBody(req, updateSchema);
    const [updated] = await db
      .update(crmSla)
      .set(input)
      .where(and(eq(crmSla.id, id), eq(crmSla.orgId, session.orgId)))
      .returning();
    if (!updated) return err("Policy not found", 404);
    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ policyId: string }> }) {
  return withAdmin(async (session) => {
    const { policyId } = await params;
    const id = Number(policyId);
    if (!Number.isFinite(id)) return err("Invalid policy id", 400);

    await db
      .delete(crmSla)
      .where(and(eq(crmSla.id, id), eq(crmSla.orgId, session.orgId)));
    return ok({ success: true });
  });
}
