import { type NextRequest } from "next/server";
import { withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { customFieldDefinitions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  label: z.string().min(1).optional(),
  options: z
    .array(z.object({ value: z.string().min(1), label: z.string().min(1) }))
    .optional()
    .nullable(),
  isRequired: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

type Ctx = { params: Promise<{ fieldId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { fieldId: rawId } = await ctx.params;
  const fieldId = Number(rawId);
  if (!Number.isFinite(fieldId)) return err("Invalid field id", 400);

  let data: z.infer<typeof updateSchema>;
  try {
    const body = await req.json();
    data = updateSchema.parse(body);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return err(e.issues.map((i) => i.message).join("; "), 400);
    }
    return err("Invalid request body", 400);
  }

  return withAdmin(async (session) => {
    const [existing] = await db
      .select({ id: customFieldDefinitions.id })
      .from(customFieldDefinitions)
      .where(
        and(
          eq(customFieldDefinitions.id, fieldId),
          eq(customFieldDefinitions.orgId, session.orgId)
        )
      )
      .limit(1);

    if (!existing) return err("Field not found", 404);

    const [updated] = await db
      .update(customFieldDefinitions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customFieldDefinitions.id, fieldId),
          eq(customFieldDefinitions.orgId, session.orgId)
        )
      )
      .returning();

    return ok({ field: updated });
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { fieldId: rawId } = await ctx.params;
  const fieldId = Number(rawId);
  if (!Number.isFinite(fieldId)) return err("Invalid field id", 400);

  return withAdmin(async (session) => {
    const [existing] = await db
      .select({ id: customFieldDefinitions.id })
      .from(customFieldDefinitions)
      .where(
        and(
          eq(customFieldDefinitions.id, fieldId),
          eq(customFieldDefinitions.orgId, session.orgId)
        )
      )
      .limit(1);

    if (!existing) return err("Field not found", 404);

    await db
      .delete(customFieldDefinitions)
      .where(
        and(
          eq(customFieldDefinitions.id, fieldId),
          eq(customFieldDefinitions.orgId, session.orgId)
        )
      );

    return ok({ success: true });
  });
}
