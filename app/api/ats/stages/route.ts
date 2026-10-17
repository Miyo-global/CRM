import type { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z, ZodError } from "zod";

import { withRoles, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { atsStages } from "@/lib/db/schema";
import { ATS_ROLES } from "@/lib/constants/roles";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { orgStages, stagesForJob } from "@/lib/ats/stages";

const createSchema = z.object({
  name: z.string().trim().min(1, "Name the stage.").max(60),
  type: z.enum(["SCREEN", "INTERVIEW", "OFFER"]).default("SCREEN"),
  jobId: z.coerce.number().int().positive().optional(),
  emailTemplateId: z.string().trim().max(120).optional(),
  autoEmail: z.boolean().default(false),
});

/** MIYO-0650: the stage list, for the org or for one job. */
export async function GET(req: NextRequest) {
  return withRoles(ATS_ROLES)(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    const jobId = Number(req.nextUrl.searchParams.get("jobId"));
    return ok(
      Number.isInteger(jobId)
        ? await stagesForJob(session.orgId, jobId)
        : await orgStages(session.orgId),
    );
  }, req);
}

export async function POST(req: NextRequest) {
  return withRoles(ATS_ROLES)(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    try {
      const body = await parseBody(req, createSchema);

      // A new stage lands before the end states, never after them.
      const existing = body.jobId
        ? await stagesForJob(session.orgId, body.jobId)
        : await orgStages(session.orgId);
      const lastMiddle = existing.filter((s) => !["HIRED", "REJECTED"].includes(s.type));
      const sort = (lastMiddle[lastMiddle.length - 1]?.sort ?? 0) + 1;

      await db
        .update(atsStages)
        .set({ sort: sort + 1 })
        .where(
          and(
            eq(atsStages.orgId, session.orgId),
            body.jobId ? eq(atsStages.jobId, body.jobId) : isNull(atsStages.jobId),
            eq(atsStages.type, "HIRED"),
          ),
        );
      await db
        .update(atsStages)
        .set({ sort: sort + 2 })
        .where(
          and(
            eq(atsStages.orgId, session.orgId),
            body.jobId ? eq(atsStages.jobId, body.jobId) : isNull(atsStages.jobId),
            eq(atsStages.type, "REJECTED"),
          ),
        );

      const [created] = await db
        .insert(atsStages)
        .values({
          orgId: session.orgId,
          jobId: body.jobId ?? null,
          name: body.name,
          type: body.type,
          sort,
          emailTemplateId: body.emailTemplateId ?? null,
          autoEmail: body.autoEmail,
          isDefault: false,
        })
        .returning();

      return ok(created, 201);
    } catch (e) {
      if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Invalid stage.", 400);
      throw e;
    }
  }, req);
}
