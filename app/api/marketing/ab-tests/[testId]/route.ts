import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { abTests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(["draft", "running", "completed", "paused"]).optional(),
  variantASubject: z.string().min(1).max(500).optional(),
  variantBSubject: z.string().min(1).max(500).optional(),
  variantABody: z.string().optional(),
  variantBBody: z.string().optional(),
  splitPercent: z.number().int().min(1).max(99).optional(),
  audienceSize: z.number().int().min(0).optional(),
  winnerVariant: z.enum(["A", "B"]).nullable().optional(),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional(),
});

type RouteContext = { params: Promise<{ testId: string }> };


export async function GET(_req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    const { testId } = await params;
    const id = Number(testId);
    if (isNaN(id)) return err("Invalid test ID", 400);

    const [test] = await db
      .select()
      .from(abTests)
      .where(and(eq(abTests.id, id), eq(abTests.orgId, session.orgId)));

    if (!test) return err("A/B test not found", 404);
    return ok(test);
  });
}


export async function PATCH(req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    const { testId } = await params;
    const id = Number(testId);
    if (isNaN(id)) return err("Invalid test ID", 400);

    const input = await parseBody(req, updateSchema);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.status !== undefined) {
      updates.status = input.status;
      if (input.status === "running" && !input.startedAt) {
        updates.startedAt = new Date();
      }
      if ((input.status === "completed" || input.status === "paused") && !input.endedAt) {
        updates.endedAt = new Date();
      }
    }
    if (input.variantASubject !== undefined) updates.variantASubject = input.variantASubject;
    if (input.variantBSubject !== undefined) updates.variantBSubject = input.variantBSubject;
    if (input.variantABody !== undefined) updates.variantABody = input.variantABody;
    if (input.variantBBody !== undefined) updates.variantBBody = input.variantBBody;
    if (input.splitPercent !== undefined) updates.splitPercent = input.splitPercent;
    if (input.audienceSize !== undefined) updates.audienceSize = input.audienceSize;
    if (input.winnerVariant !== undefined) updates.winnerVariant = input.winnerVariant;
    if (input.startedAt !== undefined) updates.startedAt = new Date(input.startedAt);
    if (input.endedAt !== undefined) updates.endedAt = new Date(input.endedAt);

    const [updated] = await db
      .update(abTests)
      .set(updates)
      .where(and(eq(abTests.id, id), eq(abTests.orgId, session.orgId)))
      .returning();

    if (!updated) return err("A/B test not found", 404);
    return ok(updated);
  });
}


export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    const { testId } = await params;
    const id = Number(testId);
    if (isNaN(id)) return err("Invalid test ID", 400);

    const [deleted] = await db
      .delete(abTests)
      .where(and(eq(abTests.id, id), eq(abTests.orgId, session.orgId)))
      .returning();

    if (!deleted) return err("A/B test not found", 404);
    return ok({ success: true });
  });
}
