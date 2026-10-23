import { withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { documentFolders, documents } from "@/lib/db/schema";
import { eq, and, ne, count, sql } from "drizzle-orm";
import { createDocumentFolderSchema } from "@/lib/validations/hr-documents";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ folderId: string }> };

async function findFolder(id: number, orgId: string) {
  const [folder] = await db
    .select()
    .from(documentFolders)
    .where(and(eq(documentFolders.id, id), eq(documentFolders.orgId, orgId)))
    .limit(1);
  return folder;
}

// Documents belong to a folder by `category` name, so a rename carries them along.
export async function PATCH(req: NextRequest, { params }: Params) {
  return withAdmin(async (session) => {
    const { folderId } = await params;
    const id = Number(folderId);
    if (!Number.isFinite(id)) return err("Invalid folder ID", 400);

    const body = await parseBody(req, createDocumentFolderSchema);
    const name = body.name.trim();

    const existing = await findFolder(id, session.orgId);
    if (!existing) return err("Folder not found", 404);

    const [clash] = await db
      .select({ id: documentFolders.id })
      .from(documentFolders)
      .where(
        and(
          eq(documentFolders.orgId, session.orgId),
          ne(documentFolders.id, id),
          sql`lower(${documentFolders.name}) = lower(${name})`,
        ),
      )
      .limit(1);
    if (clash) return err("A folder with this name already exists.", 409);

    const folder = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(documentFolders)
        .set({ name })
        .where(eq(documentFolders.id, id))
        .returning();
      await tx
        .update(documents)
        .set({ category: name, updatedAt: new Date() })
        .where(
          and(
            eq(documents.orgId, session.orgId),
            sql`lower(${documents.category}) = lower(${existing.name})`,
          ),
        );
      return updated;
    });

    return ok(folder);
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withAdmin(async (session) => {
    const { folderId } = await params;
    const id = Number(folderId);
    if (!Number.isFinite(id)) return err("Invalid folder ID", 400);

    const existing = await findFolder(id, session.orgId);
    if (!existing) return err("Folder not found", 404);

    const [{ value: docCount } = { value: 0 }] = await db
      .select({ value: count() })
      .from(documents)
      .where(
        and(
          eq(documents.orgId, session.orgId),
          eq(documents.isActive, true),
          sql`lower(${documents.category}) = lower(${existing.name})`,
        ),
      );
    if (docCount > 0) {
      return err(
        `"${existing.name}" still holds ${docCount} document${docCount === 1 ? "" : "s"}. Move ${docCount === 1 ? "it" : "them"} to another folder first.`,
        409,
      );
    }

    await db.delete(documentFolders).where(eq(documentFolders.id, id));

    return ok({ success: true });
  });
}
