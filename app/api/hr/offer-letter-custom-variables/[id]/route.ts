import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { offerLetterCustomVariables } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { isValidVariableKey } from "@/lib/hr/offer-letter-tokens";

const patchSchema = z.object({
  variableKey: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .refine(isValidVariableKey, "Variable key must start with a letter and contain only letters, numbers, and underscores")
    .optional(),
  label: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Forbidden", 403);

    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isFinite(id)) return err("Invalid variable ID.", 400);

    const body = patchSchema.parse(await req.json());

    if (body.variableKey) {
      const dup = await db.query.offerLetterCustomVariables.findFirst({
        where: and(
          eq(offerLetterCustomVariables.orgId, session.orgId),
          eq(offerLetterCustomVariables.variableKey, body.variableKey),
          ne(offerLetterCustomVariables.id, id)
        ),
        columns: { id: true },
      });
      if (dup) return err(`A variable with key "${body.variableKey}" already exists.`, 409);
    }

    const updates: Record<string, unknown> = {};
    if (body.variableKey !== undefined) updates.variableKey = body.variableKey;
    if (body.label !== undefined) updates.label = body.label;
    if (body.description !== undefined) updates.description = body.description || null;

    if (Object.keys(updates).length === 0) return err("No fields to update.", 400);

    const [updated] = await db
      .update(offerLetterCustomVariables)
      .set(updates)
      .where(
        and(
          eq(offerLetterCustomVariables.id, id),
          eq(offerLetterCustomVariables.orgId, session.orgId)
        )
      )
      .returning();

    if (!updated) return err("Variable not found.", 404);
    return ok(updated);
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Forbidden", 403);

    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isFinite(id)) return err("Invalid variable ID.", 400);

    const [deleted] = await db
      .delete(offerLetterCustomVariables)
      .where(
        and(
          eq(offerLetterCustomVariables.id, id),
          eq(offerLetterCustomVariables.orgId, session.orgId)
        )
      )
      .returning();

    if (!deleted) return err("Variable not found.", 404);
    return ok({ success: true });
  });
}
