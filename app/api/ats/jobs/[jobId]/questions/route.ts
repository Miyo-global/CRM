import type { NextRequest } from "next/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z, ZodError } from "zod";

import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { atsApplicationQuestions } from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { canOnJob } from "@/lib/ats/access";

const QUESTION_TYPES = [
  "TEXT",
  "TEXTAREA",
  "SELECT",
  "MULTISELECT",
  "BOOLEAN",
  "NUMBER",
  "FILE",
] as const;

const questionSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  label: z.string().trim().min(1, "Write the question.").max(200),
  type: z.enum(QUESTION_TYPES).default("TEXT"),
  options: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  required: z.boolean().default(false),
  /** MIYO-0635: an answer that fails this ends the application. */
  knockout: z
    .object({
      equals: z.string().trim().max(100).optional(),
      notEquals: z.string().trim().max(100).optional(),
      min: z.coerce.number().optional(),
    })
    .optional(),
});

const bodySchema = z.object({ questions: z.array(questionSchema).max(30) });

/** MIYO-0635: the extra questions one job asks on the apply form. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  return withAuth(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    const jobId = Number((await params).jobId);
    if (!Number.isInteger(jobId)) return err("Invalid job ID.", 400);

    const actor = { userId: session.user.id, orgId: session.orgId, role: session.user.role };
    if (!(await canOnJob(actor, jobId, "view"))) return err("Job not found.", 404);

    return ok(
      await db
        .select()
        .from(atsApplicationQuestions)
        .where(eq(atsApplicationQuestions.jobId, jobId))
        .orderBy(asc(atsApplicationQuestions.sort)),
    );
  }, req);
}

/** The whole list at once: what is sent is what the form will ask. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  return withAuth(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    const jobId = Number((await params).jobId);
    if (!Number.isInteger(jobId)) return err("Invalid job ID.", 400);

    const actor = { userId: session.user.id, orgId: session.orgId, role: session.user.role };
    if (!(await canOnJob(actor, jobId, "manage_job"))) return err("Forbidden", 403);

    try {
      const { questions } = await parseBody(req, bodySchema);

      const existing = await db
        .select({ id: atsApplicationQuestions.id })
        .from(atsApplicationQuestions)
        .where(eq(atsApplicationQuestions.jobId, jobId));

      // A question with answers against it is kept and updated, never
      // recreated, so the answers stay attached to it.
      const keptIds = questions.map((q) => q.id).filter((id): id is number => Boolean(id));
      const removed = existing.filter((row) => !keptIds.includes(row.id)).map((row) => row.id);
      if (removed.length > 0) {
        await db
          .delete(atsApplicationQuestions)
          .where(
            and(
              eq(atsApplicationQuestions.jobId, jobId),
              inArray(atsApplicationQuestions.id, removed),
            ),
          );
      }

      let sort = 0;
      for (const question of questions) {
        const values = {
          jobId,
          label: question.label,
          type: question.type,
          options: question.options ?? null,
          required: question.required,
          knockout: question.knockout ?? null,
          sort: sort++,
        };
        if (question.id) {
          await db
            .update(atsApplicationQuestions)
            .set(values)
            .where(
              and(
                eq(atsApplicationQuestions.id, question.id),
                eq(atsApplicationQuestions.jobId, jobId),
              ),
            );
        } else {
          await db.insert(atsApplicationQuestions).values(values);
        }
      }

      return ok(
        await db
          .select()
          .from(atsApplicationQuestions)
          .where(eq(atsApplicationQuestions.jobId, jobId))
          .orderBy(asc(atsApplicationQuestions.sort)),
      );
    } catch (e) {
      if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Invalid questions.", 400);
      throw e;
    }
  }, req);
}
