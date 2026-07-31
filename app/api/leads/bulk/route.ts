import { type NextRequest } from "next/server";
import { withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";
import { writeAuditLog } from "@/lib/db/audit";
import { z } from "zod";

const bulkUpdateSchema = z.object({
  leadIds: z.array(z.number()).min(1),
  update: z.object({
    status: z.enum(["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"]).optional(),
    priority: z.enum(["HOT", "WARM", "COLD"]).optional(),
    assignedToId: z.string().nullable().optional(),
  }),
});

const bulkDeleteSchema = z.object({
  leadIds: z.array(z.number()).min(1),
});

export async function PATCH(req: NextRequest) {
  return withAdmin(async (session) => {
    const input = await parseBody(req, bulkUpdateSchema);
    const { leadIds, update } = input;
    const setData: Record<string, unknown> = { updatedAt: new Date() };

    if (update.status) setData.status = update.status;
    if (update.priority) setData.priority = update.priority;
    if ("assignedToId" in update) {
      if (update.assignedToId) {
        setData.assignedToId = update.assignedToId;
        setData.assignedAt = new Date();
        setData.assignedById = session.user.id;
      } else {
        setData.assignedToId = null;
        setData.assignedAt = null;
        setData.assignedById = null;
      }
    }

    await db.update(leads)
      .set(setData)
      .where(and(eq(leads.orgId, session.orgId!), inArray(leads.id, leadIds), isNull(leads.deletedAt)));

    await writeAuditLog({
      action: "leads.bulk_update",
      userId: session.user.id,
      orgId: session.orgId,
      targetType: "lead",
      metadata: { leadIds, update },
    });

    return ok({ updated: leadIds.length });
  });
}

export async function DELETE(req: NextRequest) {
  return withAdmin(async (session) => {
    const input = await parseBody(req, bulkDeleteSchema);

    await db.update(leads)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(leads.orgId, session.orgId!), inArray(leads.id, input.leadIds), isNull(leads.deletedAt)));

    await writeAuditLog({
      action: "leads.bulk_delete",
      userId: session.user.id,
      orgId: session.orgId,
      targetType: "lead",
      metadata: { leadIds: input.leadIds },
    });

    return ok({ deleted: input.leadIds.length });
  });
}
