import { withAuth, withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { handbookVersions } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handbookVersionSchema } from "@/lib/validations/handbook";
import type { NextRequest } from "next/server";

const ADMIN_ROLES = new Set(["CEO", "ADMIN", "HR", "BRANCH_MANAGER", "BRANCH_HR"]);

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

export async function GET() {
  return withAuth(async (session) => {
    const isManager = ADMIN_ROLES.has(session.user.role ?? "");
    const where = isManager
      ? eq(handbookVersions.orgId, session.orgId)
      : and(eq(handbookVersions.orgId, session.orgId), eq(handbookVersions.status, "PUBLISHED"));

    const data = await db
      .select()
      .from(handbookVersions)
      .where(where)
      .orderBy(desc(handbookVersions.createdAt));

    return ok(data.map(mapHandbookRow));
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await parseBody(req, handbookVersionSchema);

    const existing = await db.query.handbookVersions.findFirst({
      where: and(
        eq(handbookVersions.orgId, session.orgId),
        eq(handbookVersions.version, body.version),
      ),
    });
    if (existing) {
      return err("A handbook version with this number already exists.", 409);
    }

    const [record] = await db
      .insert(handbookVersions)
      .values({
        orgId: session.orgId,
        version: body.version,
        title: body.title,
        description: body.description || null,
        documentUrl: body.documentUrl || null,
        changelog: body.description || null,
        status: "DRAFT",
        publishedAt: null,
        publishedBy: null,
      })
      .returning();

    return ok(mapHandbookRow(record), 201);
  });
}
