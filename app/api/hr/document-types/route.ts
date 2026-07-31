import { withAuth, withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { documentTypes } from "@/lib/db/schema/hr";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";
import { docTypeNameSchema, documentTypeNameToSlug } from "@/lib/validations/document-types";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  name: docTypeNameSchema,
  description: z.string().max(500).optional(),
  isMandatory: z.boolean().optional().default(true),
  applicableRoles: z.array(z.string()).optional().default([]),
  sortOrder: z.number().min(0, "Sort order must be a non-negative number").optional().default(0),
});

function toSlug(name: string): string {
  return documentTypeNameToSlug(name);
}

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const isAdmin =
      session.user.role === "CEO" ||
      session.user.role === "HR" ||
      session.user.role === "ADMIN";

    const rows = await db
      .select()
      .from(documentTypes)
      .where(
        isAdmin
          ? eq(documentTypes.orgId, session.orgId)
          : and(
              eq(documentTypes.orgId, session.orgId),
              eq(documentTypes.isActive, true)
            )
      )
      .orderBy(asc(documentTypes.sortOrder), asc(documentTypes.name));

    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await parseBody(req, createSchema);

    const slug = toSlug(body.name);

    const existing = await db.query.documentTypes.findFirst({
      where: and(
        eq(documentTypes.orgId, session.orgId),
        eq(documentTypes.slug, slug)
      ),
    });
    if (existing) return err("A document type with this name already exists.", 409);

    const [record] = await db
      .insert(documentTypes)
      .values({
        orgId: session.orgId,
        name: body.name,
        slug,
        description: body.description,
        isMandatory: body.isMandatory,
        applicableRoles: body.applicableRoles,
        sortOrder: body.sortOrder,
        isActive: true,
      })
      .returning();

    return ok(record, 201);
  });
}
