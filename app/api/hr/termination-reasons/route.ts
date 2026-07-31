import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { terminationReasons } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { writeAuditLog } from "@/lib/db/audit";
import {
  ensureTerminationReasonsForOrg,
  findDuplicateTerminationReasonLabel,
} from "@/lib/hr/termination-reasons";
import { terminationReasonLabelSchema } from "@/lib/validations/termination-reasons";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  label: terminationReasonLabelSchema,
  description: z.string().trim().max(2000, "Description is too long").optional(),
});

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Forbidden", 403);

    const rows = await ensureTerminationReasonsForOrg(
      session.orgId,
      session.user.id,
    );

    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Forbidden", 403);

    const body = await parseBody(req, createSchema);

    const duplicate = await findDuplicateTerminationReasonLabel(
      session.orgId,
      body.label,
    );
    if (duplicate) return err("A reason with this label already exists.", 409);

    const [maxRow] = await db
      .select({ sortOrder: terminationReasons.sortOrder })
      .from(terminationReasons)
      .where(eq(terminationReasons.orgId, session.orgId))
      .orderBy(desc(terminationReasons.sortOrder))
      .limit(1);

    const [record] = await db
      .insert(terminationReasons)
      .values({
        orgId: session.orgId,
        label: body.label.trim(),
        description: body.description?.trim() || null,
        isActive: true,
        sortOrder: (maxRow?.sortOrder ?? 0) + 1000,
        createdById: session.user.id,
      })
      .returning();

    void writeAuditLog({
      action: "TERMINATION_REASON_CREATED",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(record.id),
      targetType: "termination_reason",
      metadata: { label: record.label },
    }).catch(() => undefined);

    return ok(record, 201);
  });
}
