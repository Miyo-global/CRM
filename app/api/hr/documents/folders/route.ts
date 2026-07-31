import { withAuth, withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { documentFolders } from "@/lib/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { createDocumentFolderSchema } from "@/lib/validations/hr-documents";
import type { NextRequest } from "next/server";

export async function GET() {
  return withAuth(async (session) => {
    const rows = await db
      .select()
      .from(documentFolders)
      .where(eq(documentFolders.orgId, session.orgId))
      .orderBy(asc(documentFolders.sortOrder), asc(documentFolders.name));

    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await parseBody(req, createDocumentFolderSchema);
    const name = body.name.trim();

    const existing = await db
      .select({ id: documentFolders.id })
      .from(documentFolders)
      .where(
        sql`${documentFolders.orgId} = ${session.orgId} AND lower(${documentFolders.name}) = lower(${name})`,
      )
      .limit(1);

    if (existing.length > 0) {
      return err("A folder with this name already exists.", 409);
    }

    const maxOrder = await db
      .select({ sortOrder: documentFolders.sortOrder })
      .from(documentFolders)
      .where(eq(documentFolders.orgId, session.orgId))
      .orderBy(sql`${documentFolders.sortOrder} desc`)
      .limit(1);

    const [folder] = await db
      .insert(documentFolders)
      .values({
        orgId: session.orgId,
        name,
        sortOrder: (maxOrder[0]?.sortOrder ?? 0) + 1,
      })
      .returning();

    if (!folder) return err("Failed to create folder", 500);

    return ok(folder, 201);
  });
}
