import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { appraisalCategories, appraisalCategoryRatings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";
import type { NextRequest } from "next/server";

const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  ratingType: z.enum(["NUMERIC", "TEXT", "BOTH"]).optional(),
  weight: z.number().min(0).max(1).optional(),
  sortOrder: z.number().int().optional(),
});

type Params = { params: Promise<{ id: string }> };

/** Only the org's own rows are editable; global defaults (org_id NULL) are read-only. */
async function findOwnCategory(orgId: string, idParam: string) {
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) return null;
  return db.query.appraisalCategories.findFirst({
    where: and(eq(appraisalCategories.id, id), eq(appraisalCategories.orgId, orgId)),
    columns: { id: true },
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Only HR or the Super Admin can manage categories.", 403);
    const cat = await findOwnCategory(session.orgId, (await params).id);
    if (!cat) return err("Category not found.", 404);
    const body = await parseBody(req, updateCategorySchema);
    // The slug stays as created so existing references to it keep resolving.
    const [row] = await db
      .update(appraisalCategories)
      .set({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.ratingType !== undefined && { ratingType: body.ratingType }),
        ...(body.weight !== undefined && { weight: body.weight.toString() }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      })
      .where(eq(appraisalCategories.id, cat.id))
      .returning();
    return ok(row);
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Only HR or the Super Admin can manage categories.", 403);
    const cat = await findOwnCategory(session.orgId, (await params).id);
    if (!cat) return err("Category not found.", 404);
    const used = await db.query.appraisalCategoryRatings.findFirst({
      where: eq(appraisalCategoryRatings.categoryId, cat.id),
      columns: { id: true },
    });
    if (used) return err("This category is already used on an appraisal and cannot be deleted.", 409);
    await db.delete(appraisalCategories).where(eq(appraisalCategories.id, cat.id));
    return ok({ success: true });
  });
}
