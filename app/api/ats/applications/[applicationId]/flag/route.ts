import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateApplications } from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { canOnJob } from "@/lib/ats/access";

const bodySchema = z.object({
  state: z.enum(["READY", "BLOCKED"]),
  reason: z.string().trim().max(200).optional(),
});

/** MIYO-0655: mark a card blocked, with a word on why. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  return withAuth(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    const applicationId = Number((await params).applicationId);
    if (!Number.isInteger(applicationId)) return err("Invalid application ID.", 400);

    try {
      const body = await parseBody(req, bodySchema);

      const application = await db.query.candidateApplications.findFirst({
        where: and(
          eq(candidateApplications.id, applicationId),
          eq(candidateApplications.orgId, session.orgId),
        ),
        columns: { id: true, jobPostingId: true },
      });
      if (!application) return err("Application not found.", 404);

      const actor = { userId: session.user.id, orgId: session.orgId, role: session.user.role };
      if (!(await canOnJob(actor, application.jobPostingId, "manage_candidates"))) {
        return err("Forbidden", 403);
      }

      const [updated] = await db
        .update(candidateApplications)
        .set({
          kanbanState: body.state,
          kanbanReason: body.state === "BLOCKED" ? body.reason ?? null : null,
          updatedAt: new Date(),
        })
        .where(eq(candidateApplications.id, applicationId))
        .returning();

      return ok(updated);
    } catch (e) {
      if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Invalid flag.", 400);
      throw e;
    }
  }, req);
}
