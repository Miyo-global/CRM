import { withHrEmailTemplateAccess, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { offerLetterTemplates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
  variables: z.array(z.string()).optional(),
  documentType: z.string().optional(),
  showSignatureBlock: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  return withHrEmailTemplateAccess(async (session) => {
    const { templateId: id } = await params;
    const templateId = Number(id);
    if (isNaN(templateId)) return err("Invalid template ID.", 400);

    const body = patchSchema.parse(await req.json());

    const [updated] = await db.transaction(async (tx) => {
      if (body.isDefault) {
        await tx
          .update(offerLetterTemplates)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(offerLetterTemplates.orgId, session.orgId));
      }

      return tx
        .update(offerLetterTemplates)
        .set({ ...body, updatedAt: new Date() })
        .where(
          and(
            eq(offerLetterTemplates.id, templateId),
            eq(offerLetterTemplates.orgId, session.orgId)
          )
        )
        .returning();
    });

    if (!updated) return err("Template not found.", 404);
    return ok(updated);
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  return withHrEmailTemplateAccess(async (session) => {
    const { templateId: id } = await params;
    const templateId = Number(id);
    if (isNaN(templateId)) return err("Invalid template ID.", 400);

    const [deleted] = await db
      .delete(offerLetterTemplates)
      .where(
        and(
          eq(offerLetterTemplates.id, templateId),
          eq(offerLetterTemplates.orgId, session.orgId)
        )
      )
      .returning();

    if (!deleted) return err("Template not found.", 404);
    return ok({ success: true });
  });
}
