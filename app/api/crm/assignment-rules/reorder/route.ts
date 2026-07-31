import { withAdmin, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leadAssignmentRules } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const reorderSchema = z.object({
  ruleIds: z.array(z.number().int().positive()),
});

export async function PATCH(req: NextRequest) {
  return withAdmin(async (session) => {
    const { ruleIds } = await parseBody(req, reorderSchema);
    await db.transaction(async (tx) => {
      for (const [index, id] of ruleIds.entries()) {
        await tx
          .update(leadAssignmentRules)
          .set({ priority: ruleIds.length - index })
          .where(and(eq(leadAssignmentRules.id, id), eq(leadAssignmentRules.orgId, session.orgId)));
      }
    });
    return ok({ success: true });
  });
}
