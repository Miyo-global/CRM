import type { NextRequest } from "next/server";
import { and, asc, eq } from "drizzle-orm";

import { withRoles, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { atsApplicationQuestions, atsJobMembers, atsStages, jobPostings } from "@/lib/db/schema";
import { ATS_ROLES } from "@/lib/constants/roles";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { nextJobSlug } from "@/lib/ats/jobs";

/**
 * MIYO-0636: copy a job without its candidates. The wording, the hiring
 * team, the stages and the questions come across; applications do not.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  return withRoles(ATS_ROLES)(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    const jobId = Number((await params).jobId);
    if (!Number.isInteger(jobId)) return err("Invalid job ID.", 400);

    const source = await db.query.jobPostings.findFirst({
      where: and(eq(jobPostings.id, jobId), eq(jobPostings.orgId, session.orgId)),
    });
    if (!source) return err("Job not found.", 404);

    const title = `${source.title} (copy)`;
    const {
      id: _id,
      slug: _slug,
      publishedAt: _publishedAt,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...rest
    } = source;

    const [copy] = await db
      .insert(jobPostings)
      .values({
        ...rest,
        title,
        slug: await nextJobSlug(session.orgId, title),
        status: "DRAFT",
        publishedAt: null,
        postedBy: session.user.id,
      })
      .returning();

    const [team, questions, stages] = await Promise.all([
      db.select().from(atsJobMembers).where(eq(atsJobMembers.jobId, jobId)),
      db
        .select()
        .from(atsApplicationQuestions)
        .where(eq(atsApplicationQuestions.jobId, jobId))
        .orderBy(asc(atsApplicationQuestions.sort)),
      db.select().from(atsStages).where(eq(atsStages.jobId, jobId)).orderBy(asc(atsStages.sort)),
    ]);

    if (team.length > 0) {
      await db
        .insert(atsJobMembers)
        .values(team.map((m) => ({ jobId: copy.id, userId: m.userId, role: m.role })))
        .onConflictDoNothing();
    }
    if (questions.length > 0) {
      await db.insert(atsApplicationQuestions).values(
        questions.map((q) => ({
          jobId: copy.id,
          label: q.label,
          type: q.type,
          options: q.options,
          required: q.required,
          knockout: q.knockout,
          sort: q.sort,
        })),
      );
    }
    if (stages.length > 0) {
      await db.insert(atsStages).values(
        stages.map((s) => ({
          orgId: session.orgId,
          jobId: copy.id,
          name: s.name,
          type: s.type,
          sort: s.sort,
          emailTemplateId: s.emailTemplateId,
          autoEmail: s.autoEmail,
          isDefault: false,
        })),
      );
    }

    return ok(copy, 201);
  }, req);
}
