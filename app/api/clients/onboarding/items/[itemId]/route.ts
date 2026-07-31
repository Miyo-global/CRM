import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { clientOnboardingItems } from "@/lib/db/schema/crm";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const patchSchema = z.object({
  completedAt: z.string().nullable().optional(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().nullable().optional(),
  assignedTo: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

type Params = { params: Promise<{ itemId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    const { itemId } = await params;
    const id = Number(itemId);
    if (!Number.isFinite(id) || id <= 0) return err("Invalid item id", 400);

    const body = await parseBody(req, patchSchema);

    const [existing] = await db
      .select({ id: clientOnboardingItems.id })
      .from(clientOnboardingItems)
      .where(and(eq(clientOnboardingItems.id, id), eq(clientOnboardingItems.orgId, session.orgId)))
      .limit(1);

    if (!existing) return err("Not found", 404);

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.assignedTo !== undefined) updates.assignedTo = body.assignedTo;
    if (body.dueDate !== undefined) updates.dueDate = body.dueDate;

    if (body.completedAt !== undefined) {
      updates.completedAt = body.completedAt ? new Date(body.completedAt) : null;
      updates.completedBy = body.completedAt ? session.user.id : null;
    }

    const [updated] = await db
      .update(clientOnboardingItems)
      .set(updates)
      .where(and(eq(clientOnboardingItems.id, id), eq(clientOnboardingItems.orgId, session.orgId)))
      .returning();

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    const { itemId } = await params;
    const id = Number(itemId);
    if (!Number.isFinite(id) || id <= 0) return err("Invalid item id", 400);

    const [existing] = await db
      .select({ id: clientOnboardingItems.id })
      .from(clientOnboardingItems)
      .where(and(eq(clientOnboardingItems.id, id), eq(clientOnboardingItems.orgId, session.orgId)))
      .limit(1);

    if (!existing) return err("Not found", 404);

    await db.delete(clientOnboardingItems).where(and(eq(clientOnboardingItems.id, id), eq(clientOnboardingItems.orgId, session.orgId)));

    return ok({ success: true });
  });
}
