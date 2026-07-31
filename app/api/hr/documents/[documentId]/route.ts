import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import type { NextRequest } from "next/server";
import { createAuditLog } from "@/lib/audit-log";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateDocumentBodySchema = z.object({
  category: z
    .string()
    .max(200)
    .nullable()
    .optional()
    .transform((v) => (typeof v === "string" ? v.trim() : v)),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  return withAuth(async (session) => {
    const { documentId: id } = await params;
    const documentId = Number(id);
    if (isNaN(documentId)) return err("Invalid document ID.", 400);

    const body = await parseBody(req, updateDocumentBodySchema);

    const doc = await db.query.documents.findFirst({
      where: and(eq(documents.id, documentId), eq(documents.orgId, session.orgId)),
      columns: { id: true, userId: true, name: true, category: true },
    });

    if (!doc) return err("Document not found.", 404);

    const isOwner = doc.userId === session.user.id;
    const isAdmin = isAdminOrOwner(session.user.role);

    if (!isOwner && !isAdmin) return err("Not authorized to update this document.", 403);

    const nextCategory = body.category === "" ? null : body.category ?? null;

    const [updated] = await db
      .update(documents)
      .set({ category: nextCategory, updatedAt: new Date() })
      .where(and(eq(documents.id, documentId), eq(documents.orgId, session.orgId)))
      .returning();

    return ok(updated);
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  return withAuth(async (session) => {
    const { documentId: id } = await params;
    const documentId = Number(id);
    if (isNaN(documentId)) return err("Invalid document ID.", 400);

    const doc = await db.query.documents.findFirst({
      where: and(eq(documents.id, documentId), eq(documents.orgId, session.orgId)),
      columns: { id: true, userId: true, name: true },
    });

    if (!doc) return err("Document not found.", 404);

    const isOwner = doc.userId === session.user.id;
    const isAdmin = isAdminOrOwner(session.user.role);

    if (!isOwner && !isAdmin) return err("Not authorized to delete this document.", 403);

    await db
      .update(documents)
      .set({ isActive: false })
      .where(and(eq(documents.id, documentId), eq(documents.orgId, session.orgId)));

    void createAuditLog({
      action: "hr.document_deleted",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(documentId),
      targetType: "document",
      metadata: { name: doc.name },
    }).catch(() => {});

    return ok({ success: true });
  });
}
