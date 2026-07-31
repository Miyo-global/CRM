import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projectTemplates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

type RouteContext = { params: Promise<{ templateId: string }> };

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { templateId: idStr } = await ctx.params;
    const templateId = Number(idStr);
    if (!Number.isFinite(templateId)) return err("Invalid template ID", 400);

    const [deleted] = await db
      .delete(projectTemplates)
      .where(and(eq(projectTemplates.id, templateId), eq(projectTemplates.orgId, session.orgId)))
      .returning();

    if (!deleted) return err("Template not found", 404);
    return ok({ success: true });
  });
}
