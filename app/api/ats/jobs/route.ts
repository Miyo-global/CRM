import type { NextRequest } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { ZodError } from "zod";

import { withRoles, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { departments, jobPostings } from "@/lib/db/schema";
import { ATS_ROLES } from "@/lib/constants/roles";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { visibleJobIds } from "@/lib/ats/access";
import {
  jobColumnsFrom,
  nextJobSlug,
  requisitionUsable,
  setHiringTeam,
} from "@/lib/ats/jobs";
import { copyStagesToJob } from "@/lib/ats/stages";
import { jobBodySchema } from "@/lib/validations/ats-job";

/** MIYO-0633: the jobs this person may see. */
export async function GET(req: NextRequest) {
  return withRoles(ATS_ROLES)(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);

    const jobIds = await visibleJobIds({
      userId: session.user.id,
      orgId: session.orgId,
      role: session.user.role,
    });
    if (jobIds?.length === 0) return ok([]);

    const status = req.nextUrl.searchParams.get("status");
    const rows = await db
      .select({
        id: jobPostings.id,
        title: jobPostings.title,
        slug: jobPostings.slug,
        status: jobPostings.status,
        openings: jobPostings.openings,
        location: jobPostings.location,
        workMode: jobPostings.workMode,
        departmentName: departments.name,
        publishedAt: jobPostings.publishedAt,
        closesAt: jobPostings.closesAt,
        createdAt: jobPostings.createdAt,
      })
      .from(jobPostings)
      .leftJoin(departments, eq(departments.id, jobPostings.departmentId))
      .where(
        and(
          eq(jobPostings.orgId, session.orgId),
          jobIds ? inArray(jobPostings.id, jobIds) : undefined,
          status ? eq(jobPostings.status, status as "DRAFT") : undefined,
        ),
      )
      .orderBy(desc(jobPostings.createdAt));

    return ok(rows);
  }, req);
}

export async function POST(req: NextRequest) {
  return withRoles(ATS_ROLES)(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    try {
      const body = await parseBody(req, jobBodySchema);

      if (body.requisitionId) {
        const usable = await requisitionUsable(session.orgId, body.requisitionId);
        if (usable === "missing") return err("Requisition not found.", 404);
        if (usable === "not-approved") {
          return err("Only an approved requisition can become a job.", 409);
        }
      }

      const [created] = await db
        .insert(jobPostings)
        .values({
          ...jobColumnsFrom(body),
          orgId: session.orgId,
          status: "DRAFT",
          slug: await nextJobSlug(session.orgId, body.title),
          postedBy: session.user.id,
        })
        .returning();

      await setHiringTeam(created.id, body.hiringTeam);
      // MIYO-0650: the job takes its own copy of the stage list, so later
      // edits to the org list do not move candidates already in a pipeline.
      await copyStagesToJob(session.orgId, created.id);

      return ok(created, 201);
    } catch (e) {
      if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Invalid job.", 400);
      throw e;
    }
  }, req);
}
