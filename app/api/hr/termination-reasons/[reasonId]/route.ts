import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { terminationReasons } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { writeAuditLog } from "@/lib/db/audit";
import { findDuplicateTerminationReasonLabel } from "@/lib/hr/termination-reasons";
import { terminationReasonLabelSchema } from "@/lib/validations/termination-reasons";
import type { NextRequest } from "next/server";

const patchSchema = z
  .object({
    label: terminationReasonLabelSchema.optional(),
    description: z.string().trim().max(2000, "Description is too long").nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.label !== undefined ||
      data.description !== undefined ||
      data.isActive !== undefined,
    { message: "No fields to update" },
  );

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reasonId: string }> },
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Forbidden", 403);

    const { reasonId: rawId } = await params;
    const reasonId = Number(rawId);
    if (!reasonId) return err("Invalid ID.", 400);

    const body = await parseBody(req, patchSchema);

    const existing = await db.query.terminationReasons.findFirst({
      where: and(
        eq(terminationReasons.id, reasonId),
        eq(terminationReasons.orgId, session.orgId),
      ),
    });
    if (!existing) return err("Reason not found.", 404);

    if (body.label !== undefined) {
      const duplicate = await findDuplicateTerminationReasonLabel(
        session.orgId,
        body.label,
        reasonId,
      );
      if (duplicate) return err("A reason with this label already exists.", 409);
    }

    const updates: Partial<typeof terminationReasons.$inferInsert> = {};
    if (body.label !== undefined) updates.label = body.label.trim();
    if (body.description !== undefined) updates.description = body.description || null;
    if (body.isActive !== undefined) updates.isActive = body.isActive;

    const [record] = await db
      .update(terminationReasons)
      .set(updates)
      .where(
        and(
          eq(terminationReasons.id, reasonId),
          eq(terminationReasons.orgId, session.orgId),
        ),
      )
      .returning();

    void writeAuditLog({
      action:
        body.isActive === undefined
          ? "TERMINATION_REASON_UPDATED"
          : body.isActive
            ? "TERMINATION_REASON_ACTIVATED"
            : "TERMINATION_REASON_DEACTIVATED",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(reasonId),
      targetType: "termination_reason",
      metadata: { label: record.label, isActive: record.isActive },
    }).catch(() => undefined);

    return ok(record);
  });
}
