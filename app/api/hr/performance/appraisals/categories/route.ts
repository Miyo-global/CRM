import { withAuth, ok, err, parseBody, isUniqueViolation } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { appraisalCategories } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { categoriesVisibleTo, slugifyCategoryName } from "@/lib/hr/appraisal-categories";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createCategorySchema = z.object({
  slug: z.string().min(1).max(100).optional(),
  name: z.string().trim().min(1).max(200),
  ratingType: z.enum(["NUMERIC", "TEXT", "BOTH"]),
  weight: z.number().min(0).max(1).optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    const rows = await db
      .select()
      .from(appraisalCategories)
      .where(categoriesVisibleTo(session.orgId))
      .orderBy(asc(appraisalCategories.sortOrder), asc(appraisalCategories.id));
    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Only HR or the Super Admin can manage categories.", 403);
    const body = await parseBody(req, createCategorySchema);
    const slug = slugifyCategoryName(body.slug ?? body.name);
    if (!slug) return err("Category name must contain letters or digits.", 400);
    try {
      const [row] = await db
        .insert(appraisalCategories)
        .values({
          orgId: session.orgId,
          slug,
          name: body.name,
          ratingType: body.ratingType,
          weight: body.weight?.toString() ?? "0.2000",
          sortOrder: body.sortOrder ?? 0,
        })
        .returning();
      return ok(row, 201);
    } catch (e) {
      if (isUniqueViolation(e)) return err("A category with this name already exists.", 409);
      throw e;
    }
  });
}
