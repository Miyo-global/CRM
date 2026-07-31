import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { trainingEnrollments, trainingPrograms } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const enrollSchema = z.object({
  userId: z.string().min(1).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  return withAuth(async (session) => {
    const { programId: id } = await params;
    const programId = Number(id);
    if (!programId) return err("Invalid program ID.", 400);

    const program = await db.query.trainingPrograms.findFirst({
      where: and(eq(trainingPrograms.id, programId), eq(trainingPrograms.orgId, session.orgId)),
    });
    if (!program) return err("Program not found.", 404);

    const body = enrollSchema.parse(await req.json());
    const userId = body.userId ?? session.user.id;

    const [enrollment] = await db.insert(trainingEnrollments).values({
      orgId: session.orgId,
      programId,
      userId,
      status: "ENROLLED",
    }).returning();

    return ok(enrollment, 201);
  });
}
