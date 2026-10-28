import { type NextRequest } from "next/server";
import { withAdmin, ok, err } from "@/lib/api/helpers";
import { sendEmail } from "@/lib/email";
import { renderEmail } from "@/lib/email-templates/render";
import { isEmailTemplateId, sampleVarsFor } from "@/lib/email-templates/sample-vars";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";

const bodySchema = z.object({
  templateId: z.string().min(1),
  testEmail: z.string().email(),
});

export async function POST(req: NextRequest) {
  // SEC-0009: authorise first. Parsing the body before withAdmin answered an
  // unauthenticated caller with the route's schema.
  return withAdmin(async (session) => {
    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch {
      return err("Invalid request body — expected { templateId, testEmail }", 400);
    }

    if (body.testEmail.toLowerCase() !== (session.user.email ?? "").toLowerCase()) {
      return err("Test emails can only be sent to your own account email.", 403);
    }

    // MIYO-0155: a file template renders exactly as production does, rather
    // than from a subject line copied into this file.
    if (!isEmailTemplateId(body.templateId)) {
      return err(`Unknown template ID: ${body.templateId}`, 404);
    }

    const { subject, html, text } = renderEmail(body.templateId, sampleVarsFor(body.templateId));
    await sendEmail({ to: body.testEmail, subject: `[TEST] ${subject}`, html, text });
    // Sends from Settings used to leave no trace (P2-no-outbound-email-delivery-audit).
    await createAuditLog({
      action: "email.test_sent",
      userId: session.user.id,
      orgId: session.orgId,
      targetType: "email_template",
      metadata: { templateId: body.templateId, to: body.testEmail, subject },
    });
    return ok({ sent: true, to: body.testEmail, templateId: body.templateId });
  });
}
