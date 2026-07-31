import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { richDocuments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { richDocumentTitleSchema } from "@/lib/validations/hr-documents";
import type { NextRequest } from "next/server";

const updateRichDocumentSchema = z.object({
  title: richDocumentTitleSchema.optional(),
  contentJson: z.unknown().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  return withAuth(async (session) => {
    const { documentId: id } = await params;
    const documentId = Number(id);
    if (!documentId) return err("Invalid document ID.", 400);

    const doc = await db.query.richDocuments.findFirst({
      where: and(eq(richDocuments.id, documentId), eq(richDocuments.orgId, session.orgId)),
    });

    if (!doc) return err("Document not found.", 404);
    return ok(doc);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  return withAuth(async (session) => {
    const { documentId: id } = await params;
    const documentId = Number(id);
    if (!documentId) return err("Invalid document ID.", 400);

    const existing = await db.query.richDocuments.findFirst({
      where: and(eq(richDocuments.id, documentId), eq(richDocuments.orgId, session.orgId)),
    });
    if (!existing) return err("Document not found.", 404);

    const body = await parseBody(req, updateRichDocumentSchema);

    await db
      .update(richDocuments)
      .set({
        ...(body.title !== undefined && { title: body.title }),
        ...(body.contentJson !== undefined && { contentJson: body.contentJson }),
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(richDocuments.id, documentId));

    return ok({ success: true });
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  return withAuth(async (session) => {
    const { documentId: id } = await params;
    const documentId = Number(id);
    if (!documentId) return err("Invalid document ID.", 400);

    await db.delete(richDocuments).where(
      and(eq(richDocuments.id, documentId), eq(richDocuments.orgId, session.orgId))
    );

    return ok({ success: true });
  });
}
