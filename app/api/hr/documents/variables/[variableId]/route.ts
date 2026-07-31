import { withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { orgDocumentVariables } from "@/lib/db/schema";
import { eq, and, ne, sql } from "drizzle-orm";
import { updateOrgDocumentVariableSchema } from "@/lib/validations/hr-documents";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ variableId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  return withAdmin(async (session) => {
    const { variableId } = await params;
    const id = Number(variableId);
    if (!Number.isFinite(id)) return err("Invalid variable ID", 400);

    const body = await parseBody(req, updateOrgDocumentVariableSchema);

    const [existing] = await db
      .select()
      .from(orgDocumentVariables)
      .where(
        and(
          eq(orgDocumentVariables.id, id),
          eq(orgDocumentVariables.orgId, session.orgId),
        ),
      )
      .limit(1);

    if (!existing) return err("Variable not found", 404);

    if (body.slug) {
      const slug = body.slug.trim();
      const dup = await db
        .select({ id: orgDocumentVariables.id })
        .from(orgDocumentVariables)
        .where(
          and(
            eq(orgDocumentVariables.orgId, session.orgId),
            sql`lower(${orgDocumentVariables.slug}) = lower(${slug})`,
            ne(orgDocumentVariables.id, id),
          ),
        )
        .limit(1);
      if (dup.length > 0) {
        return err("A variable with this token name already exists.", 409);
      }
    }

    const [updated] = await db
      .update(orgDocumentVariables)
      .set({
        ...(body.slug !== undefined && { slug: body.slug.trim() }),
        ...(body.label !== undefined && { label: body.label.trim() }),
        ...(body.defaultValue !== undefined && { defaultValue: body.defaultValue }),
        updatedAt: new Date(),
      })
      .where(eq(orgDocumentVariables.id, id))
      .returning();

    if (!updated) return err("Failed to update variable", 500);

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withAdmin(async (session) => {
    const { variableId } = await params;
    const id = Number(variableId);
    if (!Number.isFinite(id)) return err("Invalid variable ID", 400);

    const [existing] = await db
      .select({ id: orgDocumentVariables.id })
      .from(orgDocumentVariables)
      .where(
        and(
          eq(orgDocumentVariables.id, id),
          eq(orgDocumentVariables.orgId, session.orgId),
        ),
      )
      .limit(1);

    if (!existing) return err("Variable not found", 404);

    await db.delete(orgDocumentVariables).where(eq(orgDocumentVariables.id, id));

    return ok({ success: true });
  });
}
