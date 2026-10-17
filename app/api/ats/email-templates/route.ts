import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import { withRoles, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { atsEmailTemplates } from "@/lib/db/schema";
import { ATS_ROLES } from "@/lib/constants/roles";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { EMAIL_CATALOG } from "@/lib/email-templates/catalog.generated";

const bodySchema = z.object({
  templateId: z.string().trim().min(1).max(120),
  subject: z.string().trim().max(200).optional(),
  body: z.string().trim().max(20000).optional(),
  /** Clears the override and goes back to the shipped wording. */
  reset: z.boolean().default(false),
});

/** MIYO-0673: an org's own wording for the candidate-facing ats-* mails. */
export async function PUT(req: NextRequest) {
  return withRoles(ATS_ROLES)(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);

    try {
      const body = await parseBody(req, bodySchema);
      if (!body.templateId.startsWith("ats-") || !(body.templateId in EMAIL_CATALOG)) {
        return err("That is not an ATS email template.", 400);
      }

      if (body.reset) {
        await db
          .delete(atsEmailTemplates)
          .where(
            and(
              eq(atsEmailTemplates.orgId, session.orgId),
              eq(atsEmailTemplates.templateId, body.templateId),
            ),
          );
        return ok({ reset: true });
      }

      const [saved] = await db
        .insert(atsEmailTemplates)
        .values({
          orgId: session.orgId,
          templateId: body.templateId,
          subject: body.subject ?? null,
          body: body.body ?? null,
          updatedBy: session.user.id,
        })
        .onConflictDoUpdate({
          target: [atsEmailTemplates.orgId, atsEmailTemplates.templateId],
          set: {
            subject: body.subject ?? null,
            body: body.body ?? null,
            updatedBy: session.user.id,
            updatedAt: new Date(),
          },
        })
        .returning();

      return ok(saved);
    } catch (e) {
      if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Invalid template.", 400);
      throw e;
    }
  }, req);
}
