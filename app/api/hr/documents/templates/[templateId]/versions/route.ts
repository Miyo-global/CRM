import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { documentTemplates, documentTemplateVersions } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ templateId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    const { templateId } = await params;
    const id = Number(templateId);
    if (!Number.isFinite(id)) return err("Invalid template ID", 400);

    const [template] = await db
      .select({ id: documentTemplates.id })
      .from(documentTemplates)
      .where(and(eq(documentTemplates.id, id), eq(documentTemplates.orgId, session.orgId)))
      .limit(1);

    if (!template) return err("Template not found", 404);

    const versions = await db
      .select()
      .from(documentTemplateVersions)
      .where(eq(documentTemplateVersions.templateId, id))
      .orderBy(desc(documentTemplateVersions.version));

    return ok(versions);
  });
}
