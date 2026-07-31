import { withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leadAssignmentRules, organizationMembers } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  assignmentType: z.enum(["assign_user", "round_robin"]).optional(),
  assignToUserId: z.string().nullable().optional(),
  roundRobinUserIds: z.array(z.string()).optional(),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.string(),
  })).optional(),
  priority: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ ruleId: string }> }) {
  return withAdmin(async (session) => {
    const { ruleId } = await params;
    const id = Number(ruleId);
    if (!Number.isFinite(id)) return err("Invalid rule id", 400);

    const input = await parseBody(req, updateSchema);

    const userIdsToCheck = [
      ...(input.assignToUserId ? [input.assignToUserId] : []),
      ...(input.roundRobinUserIds ?? []),
    ];
    if (userIdsToCheck.length > 0) {
      const members = await db
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.orgId, session.orgId),
            inArray(organizationMembers.userId, userIdsToCheck),
          ),
        );
      const validIds = new Set(members.map((m) => m.userId));
      if (userIdsToCheck.some((uid) => !validIds.has(uid))) {
        return err("One or more users do not belong to this organization", 400);
      }
    }

    const [updated] = await db
      .update(leadAssignmentRules)
      .set(input)
      .where(and(eq(leadAssignmentRules.id, id), eq(leadAssignmentRules.orgId, session.orgId)))
      .returning();
    if (!updated) return err("Rule not found", 404);
    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ ruleId: string }> }) {
  return withAdmin(async (session) => {
    const { ruleId } = await params;
    const id = Number(ruleId);
    if (!Number.isFinite(id)) return err("Invalid rule id", 400);

    await db
      .delete(leadAssignmentRules)
      .where(and(eq(leadAssignmentRules.id, id), eq(leadAssignmentRules.orgId, session.orgId)));
    return ok({ success: true });
  });
}
