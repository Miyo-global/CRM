import { NextRequest } from "next/server";
import { withAuth, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { tickets } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";
import { requireProjectAccess } from "@/lib/projects/require-project-access";
import { RANK_STEP } from "@/lib/projects/ticket-rank";

const reorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.number().int().positive(),
        status: z.string().min(1).max(80),
        order: z.number().int().min(0).max(100000),
      }).strict(),
    )
    .max(500),
}).strict();

type RouteParams = { params: Promise<{ projectId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "contribute");
    if (!guard.ok) return guard.response;

    const { items } = await parseBody(req, reorderSchema);
    if (items.length === 0) return ok({ success: true });

    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(tickets)
          .set({ status: item.status, order: item.order, rank: String((item.order + 1) * RANK_STEP), updatedAt: new Date() })
          .where(
            and(
              eq(tickets.id, item.id),
              eq(tickets.projectId, guard.projectId),
              eq(tickets.orgId, session.orgId),
              isNull(tickets.deletedAt),
            ),
          );
      }
    });

    return ok({ success: true });
  });
}
