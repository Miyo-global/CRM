import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { taskSequences, taskSequenceSteps, tasks, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { addDays } from "date-fns";

const applySchema = z.object({
  baseDate: z.string().datetime({ offset: true }),
  entityType: z.enum(["LEAD", "DEAL", "CONTACT", "PROJECT"]).optional(),
  entityId: z.number().int().positive().optional(),
  assigneeId: z.string().optional(),
});

type RouteContext = { params: Promise<{ sequenceId: string }> };


export async function POST(req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { sequenceId: seqIdStr } = await ctx.params;
    const sequenceId = Number(seqIdStr);
    if (!Number.isFinite(sequenceId)) return err("Invalid sequence ID", 400);

    const input = await parseBody(req, applySchema);
    

    const seq = await db.query.taskSequences.findFirst({
      where: and(eq(taskSequences.id, sequenceId), eq(taskSequences.orgId, session.orgId)),
      with: { steps: { orderBy: (s, { asc }) => [asc(s.order)] } },
    });

    if (!seq) return err("Sequence not found", 404);
    if (seq.steps.length === 0) return err("Sequence has no steps", 400);

    if (input.assigneeId) {
      const member = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, input.assigneeId),
          eq(organizationMembers.orgId, session.orgId),
        ),
        columns: { id: true },
      });
      if (!member) return err("Invalid assignee", 400);
    }

    const base = new Date(input.baseDate);

    const created = await db
      .insert(tasks)
      .values(
        seq.steps.map((step) => ({
          orgId: session.orgId,
          title: step.title,
          notes: step.notes ?? null,
          type: (step.type as "CALL" | "EMAIL" | "MEETING" | "CUSTOM") ?? "CUSTOM",
          status: "pending" as const,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          assigneeId: input.assigneeId ?? null,
          createdBy: session.user.id,
          dueDate: addDays(base, step.offsetDays),
        })),
      )
      .returning();

    return ok({ created, count: created.length }, 201);
  });
}
