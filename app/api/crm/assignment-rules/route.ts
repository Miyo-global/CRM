import { withAuth, withAdmin, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leadAssignmentRules } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  assignmentType: z.enum(["assign_user", "round_robin"]),
  assignToUserId: z.string().optional(),
  roundRobinUserIds: z.array(z.string()).optional(),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.string(),
  })).optional(),
  priority: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export async function GET() {
  return withAuth(async (session) => {
    const data = await db
      .select()
      .from(leadAssignmentRules)
      .where(eq(leadAssignmentRules.orgId, session.orgId))
      .orderBy(desc(leadAssignmentRules.priority))
      .limit(100);
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const input = await parseBody(req, createSchema);
    const [rule] = await db
      .insert(leadAssignmentRules)
      .values({
        orgId: session.orgId,
        name: input.name,
        assignmentType: input.assignmentType,
        assignToUserId: input.assignToUserId ?? null,
        roundRobinUserIds: input.roundRobinUserIds ?? [],
        conditions: input.conditions ?? [],
        priority: input.priority,
        isActive: input.isActive,
      })
      .returning();
    return ok(rule, 201);
  });
}
