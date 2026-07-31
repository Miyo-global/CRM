import { withAuth, withAdmin, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { crmSla } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  name: z.string().min(1),
  appliesTo: z.enum(["lead", "deal", "both"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  firstResponseHours: z.number().int().positive(),
  resolutionHours: z.number().int().positive(),
});

export async function GET() {
  return withAuth(async (session) => {
    const data = await db
      .select()
      .from(crmSla)
      .where(eq(crmSla.orgId, session.orgId))
      .orderBy(desc(crmSla.createdAt))
      .limit(100);
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const input = await parseBody(req, createSchema);
    const [policy] = await db
      .insert(crmSla)
      .values({
        orgId: session.orgId,
        name: input.name,
        appliesTo: input.appliesTo,
        priority: input.priority,
        firstResponseHours: input.firstResponseHours,
        resolutionHours: input.resolutionHours,
      })
      .returning();
    return ok(policy, 201);
  });
}
