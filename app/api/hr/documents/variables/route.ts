import { withAuth, withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { orgDocumentVariables } from "@/lib/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { orgDocumentVariableSchema } from "@/lib/validations/hr-documents";
import type { NextRequest } from "next/server";

export async function GET() {
  return withAuth(async (session) => {
    const rows = await db
      .select()
      .from(orgDocumentVariables)
      .where(eq(orgDocumentVariables.orgId, session.orgId))
      .orderBy(asc(orgDocumentVariables.slug));

    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await parseBody(req, orgDocumentVariableSchema);
    const slug = body.slug.trim();

    const existing = await db
      .select({ id: orgDocumentVariables.id })
      .from(orgDocumentVariables)
      .where(
        sql`${orgDocumentVariables.orgId} = ${session.orgId} AND lower(${orgDocumentVariables.slug}) = lower(${slug})`,
      )
      .limit(1);

    if (existing.length > 0) {
      return err("A variable with this token name already exists.", 409);
    }

    const [row] = await db
      .insert(orgDocumentVariables)
      .values({
        orgId: session.orgId,
        slug,
        label: body.label.trim(),
        defaultValue: body.defaultValue ?? "",
      })
      .returning();

    if (!row) return err("Failed to create variable", 500);

    return ok(row, 201);
  });
}
