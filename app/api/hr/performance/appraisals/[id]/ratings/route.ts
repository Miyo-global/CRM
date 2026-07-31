import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { appraisals, appraisalCategoryRatings } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { patchAppraisalRatingsSchema } from "@/lib/validations/hr-appraisals";
import { refreshOverallRating } from "@/lib/hr/appraisal-workflow";
import type { NextRequest } from "next/server";
import type { AuthSession } from "@/lib/api/helpers";

async function assertCanEditRatings(
  session: AuthSession,
  appraisal: { id: number; orgId: string; userId: string; reviewerId: string | null; currentStage: string | null }
): Promise<"self" | "manager" | null> {
  if (appraisal.orgId !== session.orgId) return null;
  if (appraisal.currentStage === "SELF_REVIEW" && appraisal.userId === session.user.id) return "self";
  if (appraisal.currentStage === "MANAGER_REVIEW" && appraisal.reviewerId === session.user.id) return "manager";
  if (isAdminOrOwner(session.user.role) && appraisal.currentStage === "MANAGER_REVIEW") return "manager";
  return null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    const { id } = await params;
    const appraisalId = Number(id);
    if (!appraisalId) return err("Invalid id.", 400);

    const appraisal = await db.query.appraisals.findFirst({
      where: and(eq(appraisals.id, appraisalId), eq(appraisals.orgId, session.orgId)),
    });
    if (!appraisal) return err("Not found.", 404);

    const mode = await assertCanEditRatings(session, appraisal);
    if (!mode) return err("You cannot edit ratings at this stage.", 403);

    const body = await parseBody(req, patchAppraisalRatingsSchema);
    const ids = body.ratings.map((r) => r.categoryId);
    if (new Set(ids).size !== ids.length) return err("Duplicate category ids.", 400);

    const existing = await db.query.appraisalCategoryRatings.findMany({
      where: and(
        eq(appraisalCategoryRatings.appraisalId, appraisalId),
        inArray(appraisalCategoryRatings.categoryId, ids)
      ),
    });
    if (existing.length !== body.ratings.length) return err("Invalid category ids.", 400);

    await db.transaction(async (tx) => {
      for (const r of body.ratings) {
        const patch: Record<string, string | Date | null> = { updatedAt: new Date() };
        if (mode === "self") {
          if (r.selfScore != null) patch.selfScore = String(r.selfScore);
          if (r.selfText !== undefined) patch.selfText = r.selfText;
        } else {
          if (r.managerScore != null) patch.managerScore = String(r.managerScore);
          if (r.managerComment !== undefined) patch.managerComment = r.managerComment;
        }

        await tx
          .update(appraisalCategoryRatings)
          .set(patch)
          .where(
            and(
              eq(appraisalCategoryRatings.appraisalId, appraisalId),
              eq(appraisalCategoryRatings.categoryId, r.categoryId)
            )
          );
      }
    });

    if (mode === "manager") {
      await refreshOverallRating(appraisalId);
    }

    const rows = await db.query.appraisalCategoryRatings.findMany({
      where: eq(appraisalCategoryRatings.appraisalId, appraisalId),
      with: { category: true },
    });
    return ok(rows);
  });
}
