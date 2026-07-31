import { type NextRequest } from "next/server";
import { withAuth, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { taskSequences, taskSequenceSteps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const stepSchema = z.object({
  title: z.string().min(1),
  type: z.string().default("CUSTOM"),
  notes: z.string().optional(),
  offsetDays: z.number().int().min(0).default(0),
  order: z.number().int().default(0),
});

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  steps: z.array(stepSchema).min(1),
});

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const sequences = await db.query.taskSequences.findMany({
      where: eq(taskSequences.orgId, session.orgId),
      with: { steps: { orderBy: (s, { asc }) => [asc(s.order)] } },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
    return ok(sequences);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const input = await parseBody(req, createSchema);
    

    const [seq] = await db
      .insert(taskSequences)
      .values({
        orgId: session.orgId,
        name: input.name,
        description: input.description,
        createdBy: session.user.id,
      })
      .returning();

    if (input.steps.length > 0) {
      await db.insert(taskSequenceSteps).values(
        input.steps.map((step, i) => ({
          sequenceId: seq.id,
          title: step.title,
          type: step.type,
          notes: step.notes,
          offsetDays: step.offsetDays,
          order: step.order ?? i,
        })),
      );
    }

    const full = await db.query.taskSequences.findFirst({
      where: eq(taskSequences.id, seq.id),
      with: { steps: { orderBy: (s, { asc }) => [asc(s.order)] } },
    });

    return ok(full, 201);
  });
}
