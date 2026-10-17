import type { NextRequest } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import { withRoles, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { atsStages, candidateApplications } from "@/lib/db/schema";
import { ATS_ROLES } from "@/lib/constants/roles";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { FIXED_STAGE_TYPES } from "@/lib/ats/stages";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  sort: z.coerce.number().int().min(0).max(99).optional(),
  emailTemplateId: z.string().trim().max(120).nullable().optional(),
  autoEmail: z.boolean().optional(),
});

/** MIYO-0650: rename a stage, reorder it, or hang a template on it. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ stageId: string }> },
) {
  return withRoles(ATS_ROLES)(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    const stageId = Number((await params).stageId);
    if (!Number.isInteger(stageId)) return err("Invalid stage ID.", 400);

    try {
      const body = await parseBody(req, patchSchema);
      const [updated] = await db
        .update(atsStages)
        .set(body)
        .where(and(eq(atsStages.id, stageId), eq(atsStages.orgId, session.orgId)))
        .returning();
      if (!updated) return err("Stage not found.", 404);
      return ok(updated);
    } catch (e) {
      if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Invalid stage.", 400);
      throw e;
    }
  }, req);
}

/** A stage holding candidates, or one the ATS needs, is not deletable. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ stageId: string }> },
) {
  return withRoles(ATS_ROLES)(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    const stageId = Number((await params).stageId);
    if (!Number.isInteger(stageId)) return err("Invalid stage ID.", 400);

    const stage = await db.query.atsStages.findFirst({
      where: and(eq(atsStages.id, stageId), eq(atsStages.orgId, session.orgId)),
    });
    if (!stage) return err("Stage not found.", 404);
    if (FIXED_STAGE_TYPES.has(stage.type)) {
      return err("Applied, Hired and Rejected cannot be removed.", 409);
    }

    const [{ value: inUse }] = await db
      .select({ value: count() })
      .from(candidateApplications)
      .where(eq(candidateApplications.stageId, stageId));
    if (inUse > 0) {
      return err(`Move the ${inUse} candidate(s) out of this stage first.`, 409);
    }

    await db.delete(atsStages).where(eq(atsStages.id, stageId));
    return ok({ deleted: true });
  }, req);
}
