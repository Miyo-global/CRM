import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { atsCandidateTagLinks, atsCandidateTags, candidates } from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { isAtsRole } from "@/lib/constants/roles";

const bodySchema = z.object({
  name: z.string().trim().min(1, "Name the tag.").max(40),
  remove: z.boolean().default(false),
});

/** MIYO-0646: tag a candidate; the tag is created on first use. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> },
) {
  return withAuth(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    if (!isAtsRole(session.user.role)) return err("Forbidden", 403);

    const candidateId = Number((await params).candidateId);
    if (!Number.isInteger(candidateId)) return err("Invalid candidate ID.", 400);

    try {
      const body = await parseBody(req, bodySchema);

      const candidate = await db.query.candidates.findFirst({
        where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
        columns: { id: true },
      });
      if (!candidate) return err("Candidate not found.", 404);

      const [tag] = await db
        .insert(atsCandidateTags)
        .values({ orgId: session.orgId, name: body.name })
        .onConflictDoUpdate({
          target: [atsCandidateTags.orgId, atsCandidateTags.name],
          set: { name: body.name },
        })
        .returning();

      if (body.remove) {
        await db
          .delete(atsCandidateTagLinks)
          .where(
            and(
              eq(atsCandidateTagLinks.candidateId, candidateId),
              eq(atsCandidateTagLinks.tagId, tag.id),
            ),
          );
        return ok({ removed: true, tag });
      }

      await db
        .insert(atsCandidateTagLinks)
        .values({ candidateId, tagId: tag.id })
        .onConflictDoNothing();

      return ok({ removed: false, tag }, 201);
    } catch (e) {
      if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Invalid tag.", 400);
      throw e;
    }
  }, req);
}
