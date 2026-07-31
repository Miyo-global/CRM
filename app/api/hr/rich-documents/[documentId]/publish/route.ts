import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { richDocuments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function PATCH(
  _req: NextRequest,
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

    await db
      .update(richDocuments)
      .set({
        isPublished: !existing.isPublished,
        updatedAt: new Date(),
      })
      .where(eq(richDocuments.id, documentId));

    return ok({ success: true });
  });
}
