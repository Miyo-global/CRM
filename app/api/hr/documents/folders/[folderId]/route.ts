import { withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { documentFolders } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ folderId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withAdmin(async (session) => {
    const { folderId } = await params;
    const id = Number(folderId);
    if (!Number.isFinite(id)) return err("Invalid folder ID", 400);

    const [existing] = await db
      .select()
      .from(documentFolders)
      .where(
        and(eq(documentFolders.id, id), eq(documentFolders.orgId, session.orgId)),
      )
      .limit(1);

    if (!existing) return err("Folder not found", 404);

    await db.delete(documentFolders).where(eq(documentFolders.id, id));

    return ok({ success: true });
  });
}
