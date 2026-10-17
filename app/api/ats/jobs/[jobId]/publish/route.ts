import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { z, ZodError } from "zod";

import { withRoles, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { jobPostings } from "@/lib/db/schema";
import { ATS_ROLES } from "@/lib/constants/roles";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { canOnJob } from "@/lib/ats/access";
import { nextJobSlug } from "@/lib/ats/jobs";
import { CAREERS_JOBS_TAG } from "@/lib/ats/careers-cache";

const bodySchema = z.object({
  action: z.enum(["publish", "unpublish", "hold", "close", "reopen"]),
});

/**
 * MIYO-0634: the states a job moves through. DRAFT and PAUSED publish to
 * OPEN; OPEN steps back to PAUSED or on to CLOSED. A closed job stays
 * closed — reopening it means publishing it again.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  return withRoles(ATS_ROLES)(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    const jobId = Number((await params).jobId);
    if (!Number.isInteger(jobId)) return err("Invalid job ID.", 400);

    const actor = { userId: session.user.id, orgId: session.orgId, role: session.user.role };
    if (!(await canOnJob(actor, jobId, "manage_job"))) return err("Forbidden", 403);

    try {
      const { action } = await parseBody(req, bodySchema);

      const job = await db.query.jobPostings.findFirst({
        where: and(eq(jobPostings.id, jobId), eq(jobPostings.orgId, session.orgId)),
      });
      if (!job) return err("Job not found.", 404);

      const set: Partial<typeof jobPostings.$inferInsert> = { updatedAt: new Date() };

      if (action === "publish" || action === "reopen") {
        if (!job.description?.trim()) {
          return err("Add a description before publishing.", 422);
        }
        if (job.closesAt && job.closesAt.getTime() <= Date.now()) {
          return err("The closing date has passed. Move it before publishing.", 422);
        }
        set.status = "OPEN";
        set.publishedAt = job.publishedAt ?? new Date();
        // A job published for the first time may still be without a slug.
        set.slug = job.slug ?? (await nextJobSlug(session.orgId, job.title));
      } else if (action === "unpublish" || action === "hold") {
        set.status = "PAUSED";
      } else {
        set.status = "CLOSED";
      }

      const [updated] = await db
        .update(jobPostings)
        .set(set)
        .where(eq(jobPostings.id, jobId))
        .returning();

      // Next 16 wants a cache profile; "max" simply drops the cached list.
      revalidateTag(CAREERS_JOBS_TAG, "max");

      return ok(updated);
    } catch (e) {
      if (e instanceof ZodError) return err("Unknown action.", 400);
      throw e;
    }
  }, req);
}
