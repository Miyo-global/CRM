import { withAuth, withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { documentTypes } from "@/lib/db/schema/hr";
import { eq, and, ne } from "drizzle-orm";
import { z } from "zod";
import { docTypeNameSchema, documentTypeNameToSlug } from "@/lib/validations/document-types";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ documentTypeId: string }> };

function toSlug(name: string): string {
  return documentTypeNameToSlug(name);
}

const patchSchema = z.object({
  name: docTypeNameSchema.optional(),
  description: z.string().max(500).optional(),
  isMandatory: z.boolean().optional(),
  isActive: z.boolean().optional(),
  applicableRoles: z.array(z.string()).optional(),
  sortOrder: z.number().min(0, "Sort order must be a non-negative number").optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    const { documentTypeId: rawId } = await params;
    const documentTypeId = Number(rawId);
    if (!Number.isFinite(documentTypeId)) return err("Invalid document type ID.", 400);

    const row = await db.query.documentTypes.findFirst({
      where: and(
        eq(documentTypes.id, documentTypeId),
        eq(documentTypes.orgId, session.orgId)
      ),
    });
    if (!row) return err("Document type not found.", 404);

    return ok(row);
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return withAdmin(async (session) => {
    const { documentTypeId: rawId } = await params;
    const documentTypeId = Number(rawId);
    if (!Number.isFinite(documentTypeId)) return err("Invalid document type ID.", 400);

    const body = await parseBody(req, patchSchema);

    const existing = await db.query.documentTypes.findFirst({
      where: and(
        eq(documentTypes.id, documentTypeId),
        eq(documentTypes.orgId, session.orgId)
      ),
    });
    if (!existing) return err("Document type not found.", 404);

    let newSlug: string | undefined;
    if (body.name !== undefined) {
      newSlug = toSlug(body.name);
      const clash = await db.query.documentTypes.findFirst({
        where: and(
          eq(documentTypes.orgId, session.orgId),
          eq(documentTypes.slug, newSlug),
          ne(documentTypes.id, documentTypeId)
        ),
        columns: { id: true },
      });
      if (clash) return err("A document type with this name already exists.", 409);
    }

    const [updated] = await db
      .update(documentTypes)
      .set({
        ...(body.name !== undefined && { name: body.name, slug: newSlug }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.isMandatory !== undefined && { isMandatory: body.isMandatory }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.applicableRoles !== undefined && { applicableRoles: body.applicableRoles }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(documentTypes.id, documentTypeId),
          eq(documentTypes.orgId, session.orgId)
        )
      )
      .returning();

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withAdmin(async (session) => {
    const { documentTypeId: rawId } = await params;
    const documentTypeId = Number(rawId);
    if (!Number.isFinite(documentTypeId)) return err("Invalid document type ID.", 400);

    const existing = await db.query.documentTypes.findFirst({
      where: and(
        eq(documentTypes.id, documentTypeId),
        eq(documentTypes.orgId, session.orgId)
      ),
    });
    if (!existing) return err("Document type not found.", 404);

    const [updated] = await db
      .update(documentTypes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(documentTypes.id, documentTypeId),
          eq(documentTypes.orgId, session.orgId)
        )
      )
      .returning();

    return ok(updated);
  });
}
