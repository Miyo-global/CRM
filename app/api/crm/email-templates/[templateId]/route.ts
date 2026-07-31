import { withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { crmEmailTemplates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ templateId: string }> }) {
  return withAdmin(async (session) => {
    const { templateId } = await params;
    const id = Number(templateId);
    if (!Number.isFinite(id)) return err("Invalid template id", 400);

    const input = await parseBody(req, updateSchema);
    const [updated] = await db
      .update(crmEmailTemplates)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(crmEmailTemplates.id, id), eq(crmEmailTemplates.orgId, session.orgId)))
      .returning();
    if (!updated) return err("Template not found", 404);
    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ templateId: string }> }) {
  return withAdmin(async (session) => {
    const { templateId } = await params;
    const id = Number(templateId);
    if (!Number.isFinite(id)) return err("Invalid template id", 400);

    await db
      .delete(crmEmailTemplates)
      .where(and(eq(crmEmailTemplates.id, id), eq(crmEmailTemplates.orgId, session.orgId)));
    return ok({ success: true });
  });
}
