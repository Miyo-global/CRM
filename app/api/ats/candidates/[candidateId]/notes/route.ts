import type { NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z, ZodError } from "zod";

import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  atsActivity,
  atsCandidateNotes,
  candidateApplications,
  candidates,
  users,
} from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { canOnJob } from "@/lib/ats/access";
import { createNotification } from "@/server/actions/create-notification";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  body: z.string().trim().min(1, "Write something.").max(5000),
  applicationId: z.coerce.number().int().positive().optional(),
  /** User ids pulled out of the @mentions by the editor. */
  mentions: z.array(z.string().min(1)).max(20).optional(),
});

/** MIYO-0646: a note on a candidate, with @mentions that notify. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> },
) {
  return withAuth(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    const candidateId = Number((await params).candidateId);
    if (!Number.isInteger(candidateId)) return err("Invalid candidate ID.", 400);

    try {
      const body = await parseBody(req, bodySchema);

      const candidate = await db.query.candidates.findFirst({
        where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
      });
      if (!candidate) return err("Candidate not found.", 404);

      // Someone on a hiring team may write on the candidates of their jobs.
      const applications = await db
        .select({ jobId: candidateApplications.jobPostingId })
        .from(candidateApplications)
        .where(eq(candidateApplications.candidateId, candidateId));
      const actor = { userId: session.user.id, orgId: session.orgId, role: session.user.role };
      const allowed = await Promise.all(
        applications.map((a) => canOnJob(actor, a.jobId, "view")),
      );
      if (applications.length > 0 && !allowed.some(Boolean)) return err("Forbidden", 403);

      const [note] = await db
        .insert(atsCandidateNotes)
        .values({
          candidateId,
          applicationId: body.applicationId ?? null,
          authorId: session.user.id,
          body: body.body,
          mentions: body.mentions ?? null,
        })
        .returning();

      await db.insert(atsActivity).values({
        orgId: session.orgId,
        candidateId,
        applicationId: body.applicationId ?? null,
        actorId: session.user.id,
        type: "note_added",
      });

      if (body.mentions?.length) {
        const mentioned = await db
          .select({ id: users.id })
          .from(users)
          .where(inArray(users.id, body.mentions));
        for (const person of mentioned) {
          try {
            await createNotification({
              userId: person.id,
              orgId: session.orgId,
              type: "INFO",
              title: `${session.user.name ?? "Someone"} mentioned you`,
              message: body.body.slice(0, 160),
              link: `/ats/candidates/${candidateId}`,
            });
          } catch (error) {
            logger.error("Mention notification failed", { candidateId, error });
          }
        }
      }

      return ok(note, 201);
    } catch (e) {
      if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Invalid note.", 400);
      throw e;
    }
  }, req);
}
