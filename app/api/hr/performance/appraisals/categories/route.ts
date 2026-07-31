import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { appraisalCategories } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createCategorySchema = z.object({
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  ratingType: z.enum(["NUMERIC", "TEXT", "BOTH"]),
  weight: z.number().min(0).max(1).optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  return withAuth(async () => {
    const rows = await db.select().from(appraisalCategories).orderBy(asc(appraisalCategories.sortOrder));
    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Only HR or CEO can manage categories.", 403);
    const body = await parseBody(req, createCategorySchema);
    const [row] = await db
      .insert(appraisalCategories)
      .values({
        slug: body.slug,
        name: body.name,
        ratingType: body.ratingType,
        weight: body.weight?.toString() ?? "0.2000",
        sortOrder: body.sortOrder ?? 0,
      })
      .returning();
    return ok(row, 201);
  });
}
