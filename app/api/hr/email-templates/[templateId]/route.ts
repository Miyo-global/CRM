import { withHrEmailTemplateAccess, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { emailTemplates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import {
  TEMPLATE_NAME_MIN,
  TEMPLATE_NAME_MAX,
  TEMPLATE_SUBJECT_MIN,
  TEMPLATE_SUBJECT_MAX,
  TEMPLATE_BODY_MIN,
  TEMPLATE_BODY_MAX,
  TEMPLATE_NAME_ALLOWED,
  TEMPLATE_NAME_ALLOWED_HINT,
} from "@/lib/hr/email-template-validation";

const patchSchema = z.object({
  name: z
    .string()
    .trim()
    .min(TEMPLATE_NAME_MIN, `Name must be at least ${TEMPLATE_NAME_MIN} characters`)
    .max(TEMPLATE_NAME_MAX, `Name must be ${TEMPLATE_NAME_MAX} characters or fewer`)
    .regex(TEMPLATE_NAME_ALLOWED, `Name can only contain ${TEMPLATE_NAME_ALLOWED_HINT}`)
    .optional(),
  subject: z
    .string()
    .trim()
    .min(TEMPLATE_SUBJECT_MIN, `Subject must be at least ${TEMPLATE_SUBJECT_MIN} characters`)
    .max(TEMPLATE_SUBJECT_MAX, `Subject must be ${TEMPLATE_SUBJECT_MAX} characters or fewer`)
    .optional(),
  body: z
    .string()
    .trim()
    .min(TEMPLATE_BODY_MIN, `Body must be at least ${TEMPLATE_BODY_MIN} characters`)
    .max(TEMPLATE_BODY_MAX, `Body must be ${TEMPLATE_BODY_MAX} characters or fewer`)
    .optional(),
  category: z.string().optional(),
  variables: z.array(z.string()).optional(),
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

    const [updated] = await db
      .update(emailTemplates)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(emailTemplates.id, templateId),
          eq(emailTemplates.orgId, session.orgId)
        )
      )
      .returning();

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
      .delete(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, templateId),
          eq(emailTemplates.orgId, session.orgId)
        )
      )
      .returning();

    if (!deleted) return err("Template not found.", 404);
    return ok({ success: true });
  });
}
