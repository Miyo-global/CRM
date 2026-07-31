import { withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { handbookVersions } from "@/lib/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { handbookUpdateSchema } from "@/lib/validations/handbook";
import type { NextRequest } from "next/server";

function mapHandbookRow(row: typeof handbookVersions.$inferSelect) {
  return {
    id: row.id,
    version: row.version,
    title: row.title,
    description: row.description ?? row.changelog ?? null,
    documentUrl: row.documentUrl ?? null,
    documentId: row.documentId,
    changelog: row.changelog,
    status: row.status,
    publishedAt: row.publishedAt,
    publishedBy: row.publishedBy,
    createdAt: row.createdAt,
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ handbookId: string }> },
) {
  return withAdmin(async (session) => {
    const { handbookId: idParam } = await params;
    const handbookId = Number(idParam);
    if (!handbookId) return err("Invalid handbook ID.", 400);

    const existing = await db.query.handbookVersions.findFirst({
      where: and(
        eq(handbookVersions.id, handbookId),
        eq(handbookVersions.orgId, session.orgId),
      ),
    });
    if (!existing) return err("Handbook version not found.", 404);

    const body = await parseBody(req, handbookUpdateSchema);

    if (body.version && body.version !== existing.version) {
      const duplicate = await db.query.handbookVersions.findFirst({
        where: and(
          eq(handbookVersions.orgId, session.orgId),
          eq(handbookVersions.version, body.version),
          ne(handbookVersions.id, handbookId),
        ),
      });
      if (duplicate) {
        return err("A handbook version with this number already exists.", 409);
      }
    }

    const nextStatus = body.status ?? existing.status;
    const publishing =
      body.status === "PUBLISHED" && existing.status !== "PUBLISHED";

    const [updated] = await db
      .update(handbookVersions)
      .set({
        ...(body.version !== undefined && { version: body.version }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && {
          description: body.description || null,
          changelog: body.description || null,
        }),
        ...(body.documentUrl !== undefined && {
          documentUrl: body.documentUrl || null,
        }),
        status: nextStatus,
        ...(publishing && {
          publishedAt: new Date(),
          publishedBy: session.user.id,
        }),
        ...(body.status === "DRAFT" && {
          publishedAt: null,
          publishedBy: null,
        }),
      })
      .where(eq(handbookVersions.id, handbookId))
      .returning();

    return ok(mapHandbookRow(updated));
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ handbookId: string }> },
) {
  return withAdmin(async (session) => {
    const { handbookId: idParam } = await params;
    const handbookId = Number(idParam);
    if (!handbookId) return err("Invalid handbook ID.", 400);

    const existing = await db.query.handbookVersions.findFirst({
      where: and(
        eq(handbookVersions.id, handbookId),
        eq(handbookVersions.orgId, session.orgId),
      ),
    });
    if (!existing) return err("Handbook version not found.", 404);

    if (existing.status === "PUBLISHED") {
      return err(
        "Cannot delete a published handbook version. Unpublish or archive it first.",
        409,
      );
    }

    await db.delete(handbookVersions).where(eq(handbookVersions.id, handbookId));

    return ok({ success: true });
  });
}
