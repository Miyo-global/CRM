import { withAuth, withAdmin, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leadScoringRules } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(["eq", "gt", "lt", "contains", "in"]),
  value: z.string().min(1),
  points: z.number().int(),
});

export async function GET() {
  return withAuth(async (session) => {
    const data = await db
      .select()
      .from(leadScoringRules)
      .where(eq(leadScoringRules.orgId, session.orgId))
      .orderBy(desc(leadScoringRules.createdAt))
      .limit(100);
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const input = await parseBody(req, createSchema);
    const [rule] = await db
      .insert(leadScoringRules)
      .values({
        orgId: session.orgId,
        field: input.field,
        operator: input.operator,
        value: input.value,
        points: input.points,
      })
      .returning();
    return ok(rule, 201);
  });
}
