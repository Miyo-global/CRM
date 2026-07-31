import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { taskSequences } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

type RouteContext = { params: Promise<{ sequenceId: string }> };

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { sequenceId: seqIdStr } = await ctx.params;
    const sequenceId = Number(seqIdStr);
    if (!Number.isFinite(sequenceId)) return err("Invalid sequence ID", 400);

    const [deleted] = await db
      .delete(taskSequences)
      .where(and(eq(taskSequences.id, sequenceId), eq(taskSequences.orgId, session.orgId)))
      .returning();

    if (!deleted) return err("Sequence not found", 404);
    return ok({ success: true });
  });
}
