import { type NextRequest } from "next/server";
import { withAuth, ok, parseBody, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { abTests } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(50),
});

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  variantASubject: z.string().min(1, "Variant A subject is required").max(500),
  variantBSubject: z.string().min(1, "Variant B subject is required").max(500),
  variantABody: z.string().optional(),
  variantBBody: z.string().optional(),
  splitPercent: z.number().int().min(1).max(99).optional().default(50),
  audienceSize: z.number().int().min(0).optional().default(0),
});


export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { page, pageSize } = parseQuery(req, listQuerySchema);

    const tests = await db
      .select()
      .from(abTests)
      .where(eq(abTests.orgId, session.orgId))
      .orderBy(desc(abTests.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return ok({ tests, page, pageSize });
  });
}


export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const input = await parseBody(req, createSchema);

    const [test] = await db
      .insert(abTests)
      .values({
        orgId: session.orgId,
        name: input.name,
        description: input.description ?? null,
        variantASubject: input.variantASubject,
        variantBSubject: input.variantBSubject,
        variantABody: input.variantABody ?? null,
        variantBBody: input.variantBBody ?? null,
        splitPercent: input.splitPercent,
        audienceSize: input.audienceSize,
        createdBy: session.user.id,
      })
      .returning();

    return ok(test, 201);
  });
}
