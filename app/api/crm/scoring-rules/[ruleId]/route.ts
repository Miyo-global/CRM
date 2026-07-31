import { withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leadScoringRules } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const updateSchema = z.object({
  field: z.string().min(1).optional(),
  operator: z.enum(["eq", "gt", "lt", "contains", "in"]).optional(),
  value: z.string().min(1).optional(),
  points: z.number().int().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ ruleId: string }> }) {
  return withAdmin(async (session) => {
    const { ruleId } = await params;
    const id = Number(ruleId);
    if (!Number.isFinite(id)) return err("Invalid rule id", 400);

    const input = await parseBody(req, updateSchema);
    const [updated] = await db
      .update(leadScoringRules)
      .set(input)
      .where(and(eq(leadScoringRules.id, id), eq(leadScoringRules.orgId, session.orgId)))
      .returning();
    if (!updated) return err("Rule not found", 404);
    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ ruleId: string }> }) {
  return withAdmin(async (session) => {
    const { ruleId } = await params;
    const id = Number(ruleId);
    if (!Number.isFinite(id)) return err("Invalid rule id", 400);

    await db
      .delete(leadScoringRules)
      .where(and(eq(leadScoringRules.id, id), eq(leadScoringRules.orgId, session.orgId)));
    return ok({ success: true });
  });
}
